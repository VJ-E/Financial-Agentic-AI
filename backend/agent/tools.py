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
from backend.db.mongo import db_manager
from backend.db.vector import upsert_transaction, semantic_search


def generate_short_id() -> str:
    """Generate a 4-character uppercase alphanumeric string."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))


@tool
async def get_financial_data(user_id: str) -> dict:
    """
    Fetches the user's financial profile and recent 50 transactions.
    
    Args:
        user_id: The unique string identifier for the user.
        
    Returns:
        A dictionary containing the user's profile (monthlyIncome, totalBalance, activeSavingsGoals)
        and an array of their recent transactions.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database connection not established."}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    
    if not profile:
        # Return a zero-state default profile for brand new users
        return {
            "success": True,
            "data": {
                "profile": {
                    "userId": user_id,
                    "monthlyIncome": 0.0,
                    "totalBalance": 0.0,
                    "activeSavingsGoals": []
                },
                "recentTransactions": []
            }
        }
        
    # Fetch the 50 most recent transactions for context
    cursor = db.transactions.find({"userId": user_id}).sort("date", -1).limit(50)
    recent_transactions = await cursor.to_list(length=50)
    
    # Process ObjectId to string for JSON serialization compatibility
    for tx in recent_transactions:
        tx["_id"] = str(tx["_id"])
        
    return {
        "success": True,
        "data": {
            "profile": {
                "userId": profile.get("userId"),
                "monthlyIncome": profile.get("monthlyIncome", 0.0),
                "totalBalance": profile.get("totalBalance", 0.0),
                "activeSavingsGoals": profile.get("activeSavingsGoals", [])
            },
            "recentTransactions": recent_transactions
        }
    }


@tool
async def add_transaction(user_id: str, description: str, amount: float, category: str) -> dict:
    """
    Adds a new transaction for a user and natively calculates the new total balance accurately.
    Valid categories are 'Fixed', 'Variable', and 'Income'.
    
    Args:
        user_id: The unique identifier of the user.
        description: The description or title of the transaction.
        amount: The monetary amount of the transaction. Must be a positive number.
        category: Must be 'Fixed', 'Variable', or 'Income'.
        
    Returns:
        A dictionary confirming the transaction addition and providing the new balance.
    """
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database not connected"}
        
    is_expense = category in ["Fixed", "Variable"]
    effective_amount = -abs(amount) if is_expense else abs(amount)
    
    transaction_doc = {
        "userId": user_id,
        "description": description,
        "amount": abs(amount),
        "category": category,
        "date": datetime.datetime.utcnow(),
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    insert_result = await db.transactions.insert_one(transaction_doc)
    tx_id_str = str(insert_result.inserted_id)
    transaction_doc["_id"] = tx_id_str
    
    # Sync safely with Qdrant vector db
    try:
        upsert_transaction(
            user_id=user_id,
            tx_id=tx_id_str,
            description=description,
            amount=abs(amount),
            category=category,
            date=str(transaction_doc["date"])
        )
    except Exception as e:
        print(f"Warning: Failed to sync transaction to Qdrant vector database: {e}")
    
    updated_profile = await db.userprofiles.find_one_and_update(
        {"userId": user_id},
        {"$inc": {"totalBalance": float(effective_amount)}, "$set": {"updatedAt": datetime.datetime.utcnow()}},
        return_document=ReturnDocument.AFTER
    )
    
    if not updated_profile:
        profile_doc = {
            "userId": user_id,
            "monthlyIncome": abs(amount) if category == "Income" else 0.0,
            "totalBalance": float(effective_amount),
            "activeSavingsGoals": [],
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
async def delete_transaction(user_id: str, transaction_id: str) -> dict:
    """
    Deletes a transaction and reverses its impact on the user's total balance.
    
    Args:
        user_id: The generic unique identifier of the user.
        transaction_id: The partial or full database ID of the transaction to delete. LLMs commonly output suffixes.
        
    Returns:
        A dictionary indicating success and the user's updated balance.
    """
    db = db_manager.db
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
        return {"success": False, "message": "Transaction not found or you don't have permission to delete it."}
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    new_balance = 0.0
    
    if profile:
        is_expense = target_tx["category"] in ["Fixed", "Variable"]
        impact = -abs(target_tx["amount"]) if is_expense else abs(target_tx["amount"])
        
        # Substract the impact to reverse it
        new_balance = float(profile.get("totalBalance", 0)) - float(impact)
        
        await db.userprofiles.update_one(
            {"userId": user_id},
            {"$set": {"totalBalance": new_balance}}
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
    new_description: Optional[str] = None, 
    new_category: Optional[str] = None
) -> dict:
    """
    Updates an existing transaction and recalculates the total balance difference.
    
    Args:
        user_id: The identifier of the user.
        transaction_id: The partial or full ID of the transaction.
        new_amount: The optional new amount.
        new_description: The optional new description.
        new_category: The optional new category ('Fixed', 'Variable', 'Income').
        
    Returns:
        Dictionary with success status, the updated transaction details, and the new total balance.
    """
    db = db_manager.db
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
        
    balance_difference = 0.0
    
    if new_amount is not None or new_category is not None:
        old_is_expense = target_tx["category"] in ["Fixed", "Variable"]
        old_impact = -abs(target_tx["amount"]) if old_is_expense else abs(target_tx["amount"])
        
        category_to_use = new_category if new_category is not None else target_tx["category"]
        amount_to_use = new_amount if new_amount is not None else target_tx["amount"]
        
        new_is_expense = category_to_use in ["Fixed", "Variable"]
        new_impact = -abs(amount_to_use) if new_is_expense else abs(amount_to_use)
        
        balance_difference = new_impact - old_impact
        
    update_fields = {}
    if new_amount is not None:
        update_fields["amount"] = abs(new_amount)
    if new_description is not None:
        update_fields["description"] = new_description
    if new_category is not None:
        update_fields["category"] = new_category
        
    if update_fields:
        update_fields["updatedAt"] = datetime.datetime.utcnow()
        await db.transactions.update_one(
            {"_id": target_tx["_id"]},
            {"$set": update_fields}
        )
        
    profile = await db.userprofiles.find_one({"userId": user_id})
    new_balance = 0.0
    
    if profile:
        new_balance = float(profile.get("totalBalance", 0)) + float(balance_difference)
        if balance_difference != 0:
            await db.userprofiles.update_one(
                {"userId": user_id},
                {"$set": {"totalBalance": new_balance}}
            )
    
    # Return updated tx locally combined
    updated_tx = {**target_tx, **update_fields}
    updated_tx["_id"] = str(updated_tx["_id"])
    
    return {
        "success": True,
        "message": "Transaction updated.",
        "data": {
            "transaction": updated_tx,
            "newBalance": new_balance
        }
    }


@tool
async def create_goal(user_id: str, title: str, target_amount: float) -> dict:
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
    
    return {
        "success": True,
        "message": f"Goal '{title}' created. Target: ₹{target_amount}.",
        "data": {
            "shortId": short_id,
            "newBalance": profile.get("totalBalance", 0.0)
        }
    }


@tool
async def fund_goal(user_id: str, short_id: str, amount: float) -> dict:
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
async def delete_goal(user_id: str, goal_id: str) -> dict:
    """
    Deletes an active savings goal. Any funds saved in this goal are returned to the user's main balance.
    
    Args:
        user_id: The generic unique identifier of the user.
        goal_id: The short 4-character ID of the goal to delete.
        
    Returns:
        A dictionary indicating success and the user's updated balance.
    """
    db = db_manager.db
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
