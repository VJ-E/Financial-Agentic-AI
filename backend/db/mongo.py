import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Explicitly load from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGO_DB_NAME", "financial_agent_db")

class MongoDBManager:
    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db = None

    async def connect_to_database(self):
        print(f"Connecting to MongoDB at {MONGO_URI}...")
        self.client = AsyncIOMotorClient(MONGO_URI)
        self.db = self.client[DATABASE_NAME]
        await self._create_indexes()
        print("Connected to MongoDB successfully.")

    async def _create_indexes(self):
        """Create necessary indexes for performance."""
        # Index for fetching transactions by userId (and sorted by date)
        await self.db.transactions.create_index([("userId", 1), ("date", -1)])
        # Index for looking up groups a user is part of
        await self.db.groups.create_index([("members.userId", 1)])

    async def close_database_connection(self):
        print("Closing MongoDB connection...")
        if self.client is not None:
            self.client.close()
            print("MongoDB connection closed.")

# Create a global instance that the FastAPI app can use
db_manager = MongoDBManager()
