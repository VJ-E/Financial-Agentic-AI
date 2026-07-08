import datetime
from backend.db.mongo import db_manager
from bson import ObjectId

async def log_revert_action(user_id: str, chat_id: str, action_type: str, payload: dict):
    """
    Logs an action to the revert_logs collection so it can be undone later.
    Action Types:
    - delete_tx (Payload needs tx_id)
    - add_tx (Payload needs tx_doc)
    - update_tx (Payload needs tx_id, old_doc)
    - delete_goal (Payload needs goal_id)
    - add_goal (Payload needs goal_doc)
    - update_goal (Payload needs goal_id, old_doc)
    """
    if db_manager.db is None or not chat_id:
        return
        
    await db_manager.db.revert_logs.insert_one({
        "userId": user_id,
        "chatId": chat_id,
        "actionType": action_type,
        "payload": payload,
        "timestamp": datetime.datetime.utcnow()
    })

async def execute_revert_action(user_id: str, log: dict):
    db = db_manager.db
    if db is None:
        return
        
    action = log["actionType"]
    payload = log["payload"]
    profile = await db.userprofiles.find_one({"userId": user_id})
    if not profile:
        return
        
    if action == "add_tx":
        # Inverse of add_tx is to delete it and refund balance.
        tx_id = payload["tx_id"]
        if isinstance(tx_id, str) and len(tx_id) == 24:
            tx_id = ObjectId(tx_id)
        tx = await db.transactions.find_one({"_id": tx_id})
        if tx:
            is_expense = (tx.get("type", "debit") == "debit") if "type" in tx else (tx.get("category") in ["Fixed", "Variable"])
            impact = -abs(tx["amount"]) if is_expense else abs(tx["amount"])
            source = tx.get("source", "bank")
            b_field = "bankBalance" if source == "bank" else "cashBalance"
            
            await db.userprofiles.update_one(
                {"userId": user_id},
                {"$inc": {"totalBalance": -impact, b_field: -impact}}
            )
            await db.transactions.delete_one({"_id": tx_id})
            
    elif action == "delete_tx":
        # Inverse of delete_tx is to re-insert it and deduct/add balance.
        doc = payload["tx_doc"]
        if "_id" in doc:
            doc["_id"] = ObjectId(doc["_id"]) if len(doc["_id"]) == 24 else doc["_id"]
        
        is_expense = (doc.get("type", "debit") == "debit") if "type" in doc else (doc.get("category") in ["Fixed", "Variable"])
        impact = -abs(doc["amount"]) if is_expense else abs(doc["amount"])
        source = doc.get("source", "bank")
        b_field = "bankBalance" if source == "bank" else "cashBalance"
        
        await db.userprofiles.update_one(
            {"userId": user_id},
            {"$inc": {"totalBalance": impact, b_field: impact}}
        )
        await db.transactions.insert_one(doc)
        
    elif action == "update_tx":
        # Revert to old_doc
        tx_id = payload["tx_id"]
        if isinstance(tx_id, str) and len(tx_id) == 24:
            tx_id = ObjectId(tx_id)
        old_doc = payload["old_doc"]
        if "_id" in old_doc:
            old_doc["_id"] = ObjectId(old_doc["_id"]) if len(old_doc["_id"]) == 24 else old_doc["_id"]
            
        current_tx = await db.transactions.find_one({"_id": tx_id})
        if current_tx:
            # Revert balance: reverse current impact, apply old impact
            curr_expense = (current_tx.get("type", "debit") == "debit") if "type" in current_tx else (current_tx.get("category") in ["Fixed", "Variable"])
            curr_impact = -abs(current_tx["amount"]) if curr_expense else abs(current_tx["amount"])
            curr_src = current_tx.get("source", "bank")
            c_field = "bankBalance" if curr_src == "bank" else "cashBalance"
            
            old_expense = (old_doc.get("type", "debit") == "debit") if "type" in old_doc else (old_doc.get("category") in ["Fixed", "Variable"])
            old_impact = -abs(old_doc["amount"]) if old_expense else abs(old_doc["amount"])
            old_src = old_doc.get("source", "bank")
            o_field = "bankBalance" if old_src == "bank" else "cashBalance"
            
            # Simple approach: update both separately
            await db.userprofiles.update_one(
                {"userId": user_id},
                {"$inc": {"totalBalance": -curr_impact, c_field: -curr_impact}}
            )
            await db.userprofiles.update_one(
                {"userId": user_id},
                {"$inc": {"totalBalance": old_impact, o_field: old_impact}}
            )
            await db.transactions.replace_one({"_id": tx_id}, old_doc)
            
    elif action == "add_goal":
        # Inverse is delete
        goal_id = payload["goal_id"]
        await db.userprofiles.update_one(
            {"userId": user_id},
            {"$pull": {"activeSavingsGoals": {"shortId": goal_id}}}
        )
        
    elif action == "fund_goal":
        # Inverse: decrease goal currentAmount, increase totalBalance
        goal_id = payload["goal_id"]
        amount = payload["amount"]
        await db.userprofiles.update_one(
            {"userId": user_id, "activeSavingsGoals.shortId": goal_id},
            {
                "$inc": {
                    "totalBalance": amount,
                    "activeSavingsGoals.$.currentAmount": -amount
                }
            }
        )
        
    elif action == "delete_goal":
        # Inverse is re-insert and deduct refunded amount from totalBalance
        goal_doc = payload["goal_doc"]
        amount = float(goal_doc.get("currentAmount", 0))
        await db.userprofiles.update_one(
            {"userId": user_id},
            {
                "$push": {"activeSavingsGoals": goal_doc},
                "$inc": {"totalBalance": -amount}
            }
        )
