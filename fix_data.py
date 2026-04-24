import asyncio
from backend.db.mongo import db_manager

async def fix():
    await db_manager.connect_to_database()
    
    # Update dropped strings gracefully to match the exact schema the backend expects
    await db_manager.db.transactions.update_many({"userId": "user123"}, {"$set": {"userId": "user_123"}})
    
    # Recalculate true deterministic balances
    txs = await db_manager.db.transactions.find({"userId": "user_123"}).to_list(100)
    bal = sum(t["amount"] if t["category"]=="Income" else -abs(t["amount"]) for t in txs)
    
    await db_manager.db.userprofiles.update_one(
        {"userId": "user_123"}, 
        {"$set": {"totalBalance": bal}}, 
        upsert=True
    )
    
    print("Database patched.")
    await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(fix())
