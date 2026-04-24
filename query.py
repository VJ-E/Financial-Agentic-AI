import asyncio
from backend.db.mongo import db_manager

async def test():
    await db_manager.connect_to_database()
    db = db_manager.db
    txs = await db.transactions.find({}).to_list(length=100)
    print("Found", len(txs), "transactions.")
    for t in txs:
        print(" ->", t.get("userId"), "|", t.get("description"), "|", t.get("amount"))
    await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(test())
