import random
import string
import datetime
from typing import Optional
import os
from ddgs import DDGS
import asyncio
from bson import ObjectId
from pymongo import ReturnDocument
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from backend.db.mongo import db_manager
from backend.db.vector import upsert_transaction, semantic_search
from backend.db.revert import log_revert_action


def generate_short_id() -> str:
    """Generate a 4-character uppercase alphanumeric string."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))


@tool
async def get_financial_data(user_id: str) -> dict:
    """
    Fetches the user's financial profile and recent transactions.
    If the user has an active group, this fetches the aggregated group balance and transactions.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database connection not established."}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    
    if not profile:
        return {
            "success": True,
            "data": {
                "profile": {
                    "userId": user_id,
                    "monthlyIncome": 0.0,
                    "totalBalance": 0.0,
                    "activeSavingsGoals": [],
                    "customCategories": ["Unknown"],
                    "merchant_category_map": {}
                },
                "recentTransactions": []
            }
        }
        
    active_group_id = profile.get("activeGroupId")
    is_group = False
    group_name = ""
    member_ids = [user_id]
    
    if active_group_id:
        group = await db.groups.find_one({"_id": active_group_id})
        if group:
            is_group = True
            group_name = group.get("name", "Unknown Group")
            member_ids = [m["userId"] for m in group.get("members", [])]
            
            # Aggregate balances across all members
            pipeline = [
                {"$match": {"userId": {"$in": member_ids}}},
                {"$group": {
                    "_id": None, 
                    "totalBalance": {"$sum": "$totalBalance"},
                    "bankBalance": {"$sum": "$bankBalance"},
                    "cashBalance": {"$sum": "$cashBalance"},
                    "monthlyIncome": {"$sum": "$monthlyIncome"}
                }}
            ]
            agg_result = await db.userprofiles.aggregate(pipeline).to_list(length=1)
            if agg_result:
                agg = agg_result[0]
                profile["totalBalance"] = agg.get("totalBalance", 0)
                profile["bankBalance"] = agg.get("bankBalance", 0)
                profile["cashBalance"] = agg.get("cashBalance", 0)
                profile["monthlyIncome"] = agg.get("monthlyIncome", 0)
                
    # Fetch recent transactions
    cursor = db.transactions.find({"userId": {"$in": member_ids}}).sort("date", -1)
    recent_transactions = await cursor.to_list(length=None)
    
    for tx in recent_transactions:
        tx["_id"] = str(tx["_id"])
        if "type" not in tx:
            tx["type"] = "credit" if tx.get("category") == "Income" else "debit"
            
    profile_data = {
        "userId": profile.get("userId"),
        "activeGroupId": profile.get("activeGroupId"),
        "monthlyIncome": profile.get("monthlyIncome", 0.0),
        "totalBalance": profile.get("totalBalance", 0.0),
        "bankBalance": profile.get("bankBalance", profile.get("totalBalance", 0.0)),
        "cashBalance": profile.get("cashBalance", 0.0),
        "activeSavingsGoals": profile.get("activeSavingsGoals", []),
        "customCategories": profile.get("customCategories", ["Unknown"]),
        "merchant_category_map": profile.get("merchant_category_map", {})
    }
    
    if is_group:
        profile_data["_GROUP_CONTEXT"] = f"You are currently analyzing data for the group '{group_name}'. Transactions belong to multiple users. When asked 'how much did we spend?', sum the transactions. When asked 'who spent the most?', compare the users."
        profile_data["groupName"] = group_name
        
    return {
        "success": True,
        "data": {
            "profile": profile_data,
            "recentTransactions": recent_transactions
        }
    }


@tool
async def add_transaction(user_id: str, name: str, amount: float, type: str, category: str, source: str = "bank", description: str = "", date: Optional[str] = None, *, config: RunnableConfig = None) -> dict:
    """
    Adds a new transaction for a user and natively calculates the new total balance accurately.
    Valid types are 'debit' and 'credit'. Categories can be any string.
    Source can be 'bank' or 'cash'.
    
    Args:
        user_id: The unique identifier of the user.
        name: The merchant or title of the transaction.
        amount: The monetary amount of the transaction. Must be a positive number.
        type: Must be 'debit' or 'credit'.
        category: A string grouping the transaction (e.g. 'Food', 'Salary').
        source: Must be 'bank' or 'cash'. Default is 'bank'.
        description: An optional detailed description or notes.
        date: An optional ISO timestamp for when the transaction occurred.
        
    Returns:
        A dictionary confirming the transaction addition and providing the new balance.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    is_expense = (type.lower() == "debit")
    effective_amount = -abs(amount) if is_expense else abs(amount)
    source_val = source.lower() if source else "bank"
    
    if date:
        try:
            tx_date = datetime.datetime.fromisoformat(date.replace('Z', '+00:00'))
        except:
            tx_date = datetime.datetime.utcnow()
    else:
        tx_date = datetime.datetime.utcnow()
        
    transaction_doc = {
        "userId": user_id,
        "name": name,
        "description": description,
        "amount": abs(amount),
        "type": type.lower(),
        "category": category,
        "source": source_val,
        "date": tx_date,
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    insert_result = await db.transactions.insert_one(transaction_doc)
    tx_id_str = str(insert_result.inserted_id)
    transaction_doc["_id"] = tx_id_str
    await log_revert_action(user_id, chat_id, "add_tx", {"tx_id": tx_id_str})
    
    # Sync safely with Qdrant vector db
    try:
        upsert_transaction(
            user_id=user_id,
            tx_id=tx_id_str,
            name=name,
            description=description,
            amount=abs(amount),
            category=category,
            date=str(transaction_doc["date"])
        )
    except Exception as e:
        print(f"Warning: Failed to sync transaction to Qdrant vector database: {e}")
    
    balance_inc_field = "bankBalance" if source_val == "bank" else "cashBalance"
    
    updated_profile = await db.userprofiles.find_one_and_update(
        {"userId": user_id},
        {
            "$inc": {"totalBalance": float(effective_amount), balance_inc_field: float(effective_amount)}, 
            "$set": {"updatedAt": datetime.datetime.utcnow()},
            "$addToSet": {"customCategories": category}
        },
        return_document=ReturnDocument.AFTER
    )
    
    if not updated_profile:
        profile_doc = {
            "userId": user_id,
            "monthlyIncome": abs(amount) if type.lower() == "credit" else 0.0,
            "totalBalance": float(effective_amount),
            "bankBalance": float(effective_amount) if source_val == "bank" else 0.0,
            "cashBalance": float(effective_amount) if source_val == "cash" else 0.0,
            "activeSavingsGoals": [],
            "customCategories": ["Unknown", category] if category != "Unknown" else ["Unknown"],
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }
        await db.userprofiles.insert_one(profile_doc)
        new_balance = profile_doc["totalBalance"]
    else:
        new_balance = updated_profile.get("totalBalance", 0.0)
        
    return {
        "success": True,
        "message": "Transaction added. Balance successfully updated.",
        "data": {
            "transaction": transaction_doc,
            "newBalance": new_balance
        }
    }


@tool
async def delete_transaction(user_id: str, transaction_id: str, *, config: RunnableConfig = None) -> dict:
    """
    Deletes a transaction and reverses its impact on the user's total balance.
    
    Args:
        user_id: The generic unique identifier of the user.
        transaction_id: The partial or full database ID of the transaction to delete. LLMs commonly output suffixes.
        
    Returns:
        A dictionary indicating success and the user's updated balance.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    # Since transaction_id can be a partial string from LLM, fetch target tx
    cursor = db.transactions.find({"userId": user_id})
    transactions = await cursor.to_list(length=None)
    
    target_tx = None
    for t in transactions:
        t_id_str = str(t["_id"]).lower()
        if t_id_str.endswith(transaction_id.lower()):
            target_tx = t
            break
            
    if not target_tx:
        return {"success": False, "message": "Transaction not found or you don\'t have permission to delete it."}

    log_doc = dict(target_tx)
    log_doc["_id"] = str(log_doc["_id"])
    await log_revert_action(user_id, chat_id, "delete_tx", {"tx_doc": log_doc})
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    new_balance = 0.0
    
    if profile:
        is_expense = (target_tx.get("type", "debit") == "debit")
        impact = -abs(target_tx["amount"]) if is_expense else abs(target_tx["amount"])
        
        # Substract the impact to reverse it
        new_balance = float(profile.get("totalBalance", 0)) - float(impact)
        source = target_tx.get("source", "bank")
        balance_field = "bankBalance" if source == "bank" else "cashBalance"
        new_source_balance = float(profile.get(balance_field, profile.get("totalBalance", 0) if balance_field == "bankBalance" else 0)) - float(impact)
        
        await db.userprofiles.update_one(
            {"userId": user_id},
            {"$set": {"totalBalance": new_balance, balance_field: new_source_balance}}
        )
        
    await db.transactions.delete_one({"_id": target_tx["_id"]})
    
    return {
        "success": True,
        "message": "Transaction deleted successfully. Balance reversed.",
        "data": {"newBalance": new_balance}
    }


@tool
async def update_transaction(
    user_id: str, 
    transaction_id: str, 
    new_amount: Optional[float] = None, 
    new_name: Optional[str] = None,
    new_description: Optional[str] = None, 
    new_type: Optional[str] = None,
    new_category: Optional[str] = None,
    new_source: Optional[str] = None,
    *, config: RunnableConfig = None
) -> dict:
    """
    Updates an existing transaction and recalculates the total balance and source balances difference.
    
    Args:
        user_id: The identifier of the user.
        transaction_id: The partial or full ID of the transaction.
        new_amount: The optional new amount.
        new_name: The optional new name/merchant.
        new_description: The optional new description.
        new_type: The optional new type ('debit', 'credit').
        new_category: The optional new category string.
        new_source: The optional new source ('bank', 'cash').
        
    Returns:
        Dictionary with success status, the updated transaction details, and the new total balance.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    cursor = db.transactions.find({"userId": user_id})
    transactions = await cursor.to_list(length=None)
    
    target_tx = None
    for t in transactions:
        t_id_str = str(t["_id"]).lower()
        if t_id_str.endswith(transaction_id.lower()):
            target_tx = t
            break
            
    if not target_tx:
        return {"success": False, "message": "Transaction not found."}

    log_doc = dict(target_tx)
    log_doc["_id"] = str(log_doc["_id"])
    await log_revert_action(user_id, chat_id, "update_tx", {"tx_id": str(target_tx["_id"]), "old_doc": log_doc})
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    
    update_fields = {}
    if new_amount is not None:
        update_fields["amount"] = abs(new_amount)
    if new_name is not None:
        update_fields["name"] = new_name
    if new_description is not None:
        update_fields["description"] = new_description
    if new_type is not None:
        update_fields["type"] = new_type.lower()
    if new_category is not None:
        update_fields["category"] = new_category
    if new_source is not None:
        update_fields["source"] = new_source.lower()
        
    if update_fields and profile:
        old_is_expense = (target_tx.get("type", "debit") == "debit")
        old_impact = -abs(target_tx["amount"]) if old_is_expense else abs(target_tx["amount"])
        old_source = target_tx.get("source", "bank")
        
        type_to_use = update_fields.get("type", target_tx.get("type", "debit"))
        category_to_use = update_fields.get("category", target_tx.get("category", "Unknown"))
        amount_to_use = update_fields.get("amount", target_tx["amount"])
        source_to_use = update_fields.get("source", old_source)
        
        new_is_expense = (type_to_use == "debit")
        new_impact = -abs(amount_to_use) if new_is_expense else abs(amount_to_use)
        
        # Calculate balance adjustments
        total_balance = float(profile.get("totalBalance", 0))
        bank_balance = float(profile.get("bankBalance", total_balance))
        cash_balance = float(profile.get("cashBalance", 0))
        
        # Revert old impact
        total_balance -= old_impact
        if old_source == "bank": bank_balance -= old_impact
        else: cash_balance -= old_impact
        
        # Apply new impact
        total_balance += new_impact
        if source_to_use == "bank": bank_balance += new_impact
        else: cash_balance += new_impact
        
        update_fields["updatedAt"] = datetime.datetime.utcnow()
        await db.transactions.update_one(
            {"_id": target_tx["_id"]},
            {"$set": update_fields}
        )
        
        try:
            upsert_transaction(
                user_id=user_id,
                tx_id=str(target_tx["_id"]),
                name=update_fields.get("name", target_tx.get("name", target_tx.get("description", ""))),
                description=update_fields.get("description", target_tx.get("description", "")),
                amount=abs(amount_to_use),
                category=category_to_use,
                date=str(target_tx["date"])
            )
        except Exception as e:
            print(f"Warning: Failed to sync updated transaction to Qdrant vector database: {e}")
        
        await db.userprofiles.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "totalBalance": total_balance,
                    "bankBalance": bank_balance,
                    "cashBalance": cash_balance
                },
                "$addToSet": {"customCategories": category_to_use}
            }
        )
        
        new_total_balance = total_balance
    else:
        new_total_balance = float(profile.get("totalBalance", 0)) if profile else 0.0

    # Return updated tx locally combined
    updated_tx = {**target_tx, **update_fields}
    updated_tx["_id"] = str(updated_tx["_id"])
    
    return {
        "success": True,
        "message": "Transaction updated.",
        "data": {
            "transaction": updated_tx,
            "newBalance": new_total_balance
        }
    }


@tool
async def create_goal(user_id: str, title: str, target_amount: float, *, config: RunnableConfig = None) -> dict:
    """
    Creates a new active savings goal for the user.
    
    Args:
        user_id: The unique identifier of the user.
        title: The name of the savings goal (e.g., "Emergency Fund").
        target_amount: The target monetary amount required to complete the goal.
        
    Returns:
        Dictionary detailing the newly generated goal's shortId and the current total balance.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    if not profile:
        return {"success": False, "message": "User profile not found."}
        
    short_id = generate_short_id()
    new_goal = {
        "shortId": short_id,
        "title": title,
        "targetAmount": abs(target_amount),
        "currentAmount": 0.0
    }
    
    await db.userprofiles.update_one(
        {"userId": user_id},
        {"$push": {"activeSavingsGoals": new_goal}}
    )
    await log_revert_action(user_id, chat_id, "add_goal", {"goal_id": short_id})
    
    return {
        "success": True,
        "message": f"Goal '{title}' created. Target: ₹{target_amount}.",
        "data": {
            "shortId": short_id,
            "newBalance": profile.get("totalBalance", 0.0)
        }
    }


@tool
async def fund_goal(user_id: str, short_id: str, amount: float, *, config: RunnableConfig = None) -> dict:
    """
    Funds a specific active savings goal by securely verifying funds via atomic decrements.
    
    Args:
        user_id: The user's ID.
        short_id: The short string ID mapping to the target goal vault.
        amount: Amount to transfer out of totalBalance and into the goal's currentAmount.
        
    Returns:
        Dictionary on transaction success/failure and the newly resulting balance amounts.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    funding_amount = abs(amount)
    
    profile = await db.userprofiles.find_one_and_update(
        {
            "userId": user_id,
            "totalBalance": {"$gte": funding_amount},
            "activeSavingsGoals.shortId": short_id
        },
        {
            "$inc": {
                "totalBalance": -funding_amount,
                "activeSavingsGoals.$.currentAmount": funding_amount
            }
        },
        return_document=ReturnDocument.AFTER
    )
    if profile:
        await log_revert_action(user_id, chat_id, "fund_goal", {"goal_id": short_id, "amount": funding_amount})
    
    if not profile:
        check_profile = await db.userprofiles.find_one({"userId": user_id})
        if not check_profile:
            return {"success": False, "message": "Profile not found."}
            
        goals = check_profile.get("activeSavingsGoals", [])
        goal_exists = any(g.get("shortId") == short_id for g in goals)
        
        if not goal_exists:
            return {"success": False, "message": f"Savings goal #{short_id} not found."}
            
        current_balance = check_profile.get("totalBalance", 0)
        return {
            "success": False,
            "message": f"Insufficient funds. Your total balance is ₹{current_balance}, but you attempted to secure ₹{funding_amount} into the vault."
        }
        
    # Find the updated goal object to return
    updated_goal = None
    for g in profile.get("activeSavingsGoals", []):
        if g.get("shortId") == short_id:
            updated_goal = g
            break
            
    return {
        "success": True,
        "message": f"Successfully transferred ₹{funding_amount} into vault #{short_id}.",
        "data": {
            "newBalance": profile.get("totalBalance", 0),
            "goal": updated_goal
        }
    }


@tool
async def search_history(user_id: str, query: str) -> dict:
    """
    Called when the user asks vague, qualitative, or semantic questions about their past spending 
    (e.g., "how much do I spend on food", "what are my subscriptions", "impulse buys from last month").
    Utilizes a local Vector Database to semantically embed the request and retrieve matching transaction payloads.
    
    Args:
        user_id: The specific ID matching the user.
        query: The natural language question or description about the expenditures to search against.
        
    Returns:
        A dictionary containing the Top-5 matching historical transactions contextualized around the semantic query.
    """
    if db_manager.db is None:
        return {"success": False, "message": "Database not connected"}
        
    try:
        # Calls the generic SentenceTransformer Qdrant execution safely.
        results = semantic_search(user_id=user_id, query=query, limit=5)
        
        return {
            "success": True,
            "message": f"Successfully retrieved {len(results)} relevant transactions based on query: '{query}'.",
            "data": {
                "transactions": results
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to perform semantic search: {str(e)}"
        }

@tool
async def web_search(query: str) -> dict:
    """
    Called when the user asks for real-world information, current events, or prices (e.g., gold, stocks, news).
    Executes a web search and returns the top snippets.
    
    Args:
        query: The specific question or search term.
        
    Returns:
        A dictionary containing the search snippets or an error message.
    """
    try:
        def fetch_results():
            return DDGS().text(query, max_results=5)
        
        results = await asyncio.to_thread(fetch_results)
        if not results:
            return {"success": False, "message": f"No results found for query: {query}"}
            
        snippets = []
        for item in results:
            title = item.get("title", "")
            content = item.get("body", "")
            if content:
                snippets.append(f"Title: {title}\nSnippet: {content}")
                
        return {
            "success": True,
            "data": "\n\n".join(snippets)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Web search failed: {str(e)}"
        }

@tool
async def delete_goal(user_id: str, goal_id: str, *, config: RunnableConfig = None) -> dict:
    """
    Deletes an active savings goal. Any funds saved in this goal are returned to the user's main balance.
    
    Args:
        user_id: The generic unique identifier of the user.
        goal_id: The short 4-character ID of the goal to delete.
        
    Returns:
        A dictionary indicating success and the user's updated balance.
    """
    db = db_manager.db
    chat_id = config.get("configurable", {}).get("chat_id") if config else None
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    if not profile:
        return {"success": False, "message": "User profile not found."}
        
    goals = profile.get("activeSavingsGoals", [])
    target_goal = None
    for g in goals:
        if g.get("shortId", "").lower() == goal_id.lower():
            target_goal = g
            break
            
    if not target_goal:
        return {"success": False, "message": "Goal not found. Use get_financial_data to check IDs."}
        
    refund_amount = float(target_goal.get("currentAmount", 0.0))
    new_balance = float(profile.get("totalBalance", 0.0)) + refund_amount
    await log_revert_action(user_id, chat_id, "delete_goal", {"goal_doc": target_goal})
    
    await db.userprofiles.update_one(
        {"userId": user_id},
        {
            "$set": {"totalBalance": new_balance},
            "$pull": {"activeSavingsGoals": {"shortId": target_goal["shortId"]}}
        }
    )
    
    return {
        "success": True,
        "message": f"Goal '{target_goal['title']}' deleted. ₹{refund_amount} refunded to main balance.",
        "data": {
            "newBalance": new_balance
        }
    }

@tool
async def update_memory(user_id: str, key: str, value: str, *, config: RunnableConfig = None) -> dict:
    """
    Saves a user preference or long-term memory fact.
    
    Args:
        user_id: The identifier of the user.
        key: A short string identifying the trait (e.g. 'risk_tolerance', 'dietary_preference', 'tax_bracket').
        value: The string value to remember.
        
    Returns:
        A dictionary indicating success.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    await db.userprofiles.update_one(
        {"userId": user_id},
        {"$set": {f"preferences.{key}": value}}
    )
    return {"success": True, "message": f"Memory saved: {key} = {value}"}

@tool
async def tax_calculator(income: float, deductions: float) -> dict:
    """
    A specific playbook tool for the Tax Analyst skill. Calculates estimated tax liability based on standard Indian tax slabs.
    
    Args:
        income: Total annual income.
        deductions: Total eligible deductions under section 80C etc.
        
    Returns:
        A dictionary with the estimated tax liability.
    """
    taxable_income = max(0, income - deductions)
    tax = 0.0
    # Simplified New Tax Regime slabs (approximate)
    if taxable_income <= 300000:
        tax = 0.0
    elif taxable_income <= 600000:
        tax = (taxable_income - 300000) * 0.05
    elif taxable_income <= 900000:
        tax = 15000 + (taxable_income - 600000) * 0.10
    elif taxable_income <= 1200000:
        tax = 45000 + (taxable_income - 900000) * 0.15
    elif taxable_income <= 1500000:
        tax = 90000 + (taxable_income - 1200000) * 0.20
    else:
        tax = 150000 + (taxable_income - 1500000) * 0.30
        
    # Standard rebate under 87A (Simplified: up to 7L income is tax free)
    if taxable_income <= 700000:
        tax = 0.0
        
    cess = tax * 0.04
    total_tax = tax + cess
    
    return {
        "success": True,
        "data": {
            "taxable_income": taxable_income,
            "estimated_tax": tax,
            "health_education_cess": cess,
            "total_tax_liability": total_tax
        }
    }

@tool
async def investment_analyzer(ticker: str, amount: float) -> dict:
    """
    A specific playbook tool for the Investment Analyst skill. Analyzes potential returns for a given ticker or asset class.
    
    Args:
        ticker: The stock ticker, mutual fund symbol, or asset class (e.g., 'NIFTY50', 'GOLD', 'FD').
        amount: The monetary amount to invest.
        
    Returns:
        A dictionary with projected future values based on historical average CAGRs.
    """
    cagr_map = {
        "NIFTY50": 0.12,
        "GOLD": 0.08,
        "FD": 0.065,
        "S&P500": 0.10,
        "REAL_ESTATE": 0.07,
    }
    
    upper_ticker = ticker.upper()
    cagr = cagr_map.get(upper_ticker, 0.10) # default to 10%
    
    def project(years):
        return amount * ((1 + cagr) ** years)
        
    return {
        "success": True,
        "data": {
            "asset": upper_ticker,
            "assumed_cagr": cagr,
            "invested_amount": amount,
            "projected_5_years": project(5),
            "projected_10_years": project(10),
            "projected_20_years": project(20)
        }
    }


@tool
async def audit_subscriptions(user_id: str) -> dict:
    """
    Scans transaction history to find recurring subscriptions and flags unused ones.
    Calculates total monthly and annual subscription spend.
    
    Args:
        user_id: The specific ID matching the user.
        
    Returns:
        A dictionary with subscription analysis results.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    six_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=180)
    
    pipeline = [
        {"$match": {
            "userId": user_id, 
            "type": "debit",
            "date": {"$gte": six_months_ago}
        }},
        {"$group": {
            "_id": "$name",
            "count": {"$sum": 1},
            "total_spent": {"$sum": "$amount"},
            "avg_amount": {"$avg": "$amount"},
            "last_date": {"$max": "$date"}
        }},
        {"$match": {
            "count": {"$gte": 3}
        }},
        {"$sort": {"total_spent": -1}}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(length=None)
    
    total_monthly = 0
    subs = []
    
    for r in results:
        monthly_cost = r["avg_amount"]
        total_monthly += monthly_cost
        subs.append({
            "merchant": r["_id"],
            "monthly_cost": round(monthly_cost, 2),
            "annual_cost": round(monthly_cost * 12, 2),
            "frequency_in_6_months": r["count"],
            "last_charged": r["last_date"].strftime("%Y-%m-%d") if isinstance(r["last_date"], datetime.datetime) else str(r["last_date"])
        })
        
    return {
        "success": True,
        "message": f"Found {len(subs)} possible subscriptions.",
        "data": {
            "total_monthly_spend": round(total_monthly, 2),
            "total_annual_spend": round(total_monthly * 12, 2),
            "subscriptions": subs
        }
    }

@tool
async def calculate_emergency_fund(user_id: str) -> dict:
    """
    Calculates a 3-6 month emergency fund target based on essential expenses from recent transactions.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    three_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=90)
    
    pipeline = [
        {"$match": {
            "userId": user_id, 
            "type": "debit",
            "date": {"$gte": three_months_ago},
        }},
        {"$group": {
            "_id": None,
            "total_essential": {"$sum": "$amount"}
        }}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(length=1)
    
    if not results:
        total_90_days = 0.0
    else:
        # Assuming roughly 70% of total debit is essential for estimation if uncategorized correctly
        total_90_days = results[0]["total_essential"] * 0.70
        
    monthly_essential = total_90_days / 3.0
    
    target_3_months = monthly_essential * 3
    target_6_months = monthly_essential * 6
    
    profile = await db.userprofiles.find_one({"userId": user_id})
    current_cash = profile.get("cashBalance", 0.0) + profile.get("bankBalance", profile.get("totalBalance", 0.0))
    
    return {
        "success": True,
        "data": {
            "monthly_essential_expense_estimate": round(monthly_essential, 2),
            "target_3_months": round(target_3_months, 2),
            "target_6_months": round(target_6_months, 2),
            "current_liquid_cash": current_cash,
            "gap_to_6_months": round(max(0, target_6_months - current_cash), 2)
        }
    }

@tool
async def review_spending(user_id: str, days: int = 30) -> dict:
    """
    Generates a categorized breakdown of spending.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    start_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "userId": user_id, 
            "type": "debit",
            "date": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$category",
            "total_spent": {"$sum": "$amount"}
        }},
        {"$sort": {"total_spent": -1}}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(length=None)
    total_spent = sum(r["total_spent"] for r in results)
    
    breakdown = []
    for r in results:
        breakdown.append({
            "category": r["_id"],
            "amount": round(r["total_spent"], 2),
            "percentage_of_total": round((r["total_spent"] / total_spent * 100), 2) if total_spent > 0 else 0
        })
        
    return {
        "success": True,
        "message": f"Spending review for last {days} days.",
        "data": {
            "total_spent": round(total_spent, 2),
            "categories": breakdown
        }
    }

@tool
async def track_financial_goal(user_id: str, goal_short_id: str, target_date_str: str) -> dict:
    """
    Computes remaining target, required monthly savings, and tracks progress for a specific goal.
    target_date_str: ISO string of the target date (e.g. '2026-12-31').
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    if not profile:
        return {"success": False, "message": "Profile not found"}
        
    goals = profile.get("activeSavingsGoals", [])
    target_goal = next((g for g in goals if g.get("shortId") == goal_short_id), None)
    
    if not target_goal:
        return {"success": False, "message": f"Goal {goal_short_id} not found."}
        
    try:
        target_date = datetime.datetime.fromisoformat(target_date_str.replace('Z', '+00:00'))
    except Exception:
        target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d")
        
    today = datetime.datetime.utcnow()
    
    months_remaining = max(1, (target_date.year - today.year) * 12 + target_date.month - today.month)
    
    target_amount = target_goal.get("targetAmount", 0)
    current_amount = target_goal.get("currentAmount", 0)
    
    remaining_amount = max(0, target_amount - current_amount)
    monthly_required = remaining_amount / months_remaining
    
    return {
        "success": True,
        "data": {
            "title": target_goal.get("title"),
            "targetAmount": target_amount,
            "currentAmount": current_amount,
            "progress_percentage": round((current_amount / target_amount * 100), 2) if target_amount > 0 else 0,
            "months_remaining": months_remaining,
            "monthly_savings_required": round(monthly_required, 2)
        }
    }

@tool
async def detect_lifestyle_creep(user_id: str) -> dict:
    """
    Detects lifestyle creep by comparing spending in the last 6 months against the 6 months prior.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    today = datetime.datetime.utcnow()
    six_months_ago = today - datetime.timedelta(days=180)
    twelve_months_ago = today - datetime.timedelta(days=360)
    
    async def get_spend(start, end):
        pipeline = [
            {"$match": {
                "userId": user_id, 
                "type": "debit",
                "date": {"$gte": start, "$lt": end}
            }},
            {"$group": {
                "_id": "$category",
                "total_spent": {"$sum": "$amount"}
            }}
        ]
        res = await db.transactions.aggregate(pipeline).to_list(length=None)
        return {r["_id"]: r["total_spent"] for r in res}
        
    recent_spend = await get_spend(six_months_ago, today)
    older_spend = await get_spend(twelve_months_ago, six_months_ago)
    
    creep = {}
    for cat, recent_amt in recent_spend.items():
        older_amt = older_spend.get(cat, 0.0)
        if recent_amt > older_amt * 1.1: # 10% increase threshold
            creep[cat] = {
                "previous_6_months": round(older_amt, 2),
                "last_6_months": round(recent_amt, 2),
                "increase": round(recent_amt - older_amt, 2),
                "increase_percentage": round(((recent_amt - older_amt) / older_amt * 100) if older_amt > 0 else 100.0, 2)
            }
            
    return {
        "success": True,
        "message": f"Detected potential lifestyle creep in {len(creep)} categories.",
        "data": creep
    }

@tool
async def calculate_net_worth(user_id: str) -> dict:
    """
    Calculates net worth from liquid assets and active goal vaults.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    if not profile:
        return {"success": False, "message": "Profile not found"}
        
    assets = profile.get("totalBalance", 0.0)
    
    goals = profile.get("activeSavingsGoals", [])
    goals_total = sum(g.get("currentAmount", 0) for g in goals)
    
    return {
        "success": True,
        "data": {
            "liquid_assets": assets,
            "goal_vaults": goals_total,
            "total_net_worth": assets + goals_total
        }
    }

