import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("../.env.local")
load_dotenv(".env.local")

async def migrate():
    MONGO_URI = os.getenv("MONGODB_URI")
    if not MONGO_URI:
        print("MONGODB_URI not set!")
        return

    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database("financial_agent_db")

    OLD_ID = "user_123"
    NEW_ID = "vijay"

    print(f"Migrating data from {OLD_ID} to {NEW_ID}...")

    # 1. Update Profile
    profile_result = await db.userprofiles.update_many(
        {"userId": OLD_ID},
        {"$set": {"userId": NEW_ID}}
    )
    print(f"Profiles updated: {profile_result.modified_count}")

    # 2. Update Transactions
    tx_result = await db.transactions.update_many(
        {"userId": OLD_ID},
        {"$set": {"userId": NEW_ID}}
    )
    print(f"Transactions updated: {tx_result.modified_count}")

    # 3. Update Pending Transactions
    pending_result = await db.pending_transactions.update_many(
        {"userId": OLD_ID},
        {"$set": {"userId": NEW_ID}}
    )
    print(f"Pending Transactions updated: {pending_result.modified_count}")

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
