import asyncio
from backend.db.mongo import db_manager
from backend.db.vector import init_qdrant
from backend.agent.tools import add_transaction, create_goal, fund_goal

async def seed():
    await db_manager.connect_to_database()
    init_qdrant()
    
    print("Injecting Seed Data into System...")
    user_id = "user_123"
    
    print("Populating Salary...")
    await add_transaction.ainvoke({"user_id": user_id, "description": "Acme Corp Tech Salary", "amount": 6500.0, "category": "Income"})
    
    print("Populating Expenditures...")
    await add_transaction.ainvoke({"user_id": user_id, "description": "Equinox Gym Access", "amount": 250.0, "category": "Fixed"})
    await add_transaction.ainvoke({"user_id": user_id, "description": "Delta Airlines Flight to NYC", "amount": 420.0, "category": "Variable"})
    await add_transaction.ainvoke({"user_id": user_id, "description": "Starbucks Reserve Morning Run", "amount": 12.50, "category": "Variable"})
    await add_transaction.ainvoke({"user_id": user_id, "description": "Whole Foods Market Groceries", "amount": 185.0, "category": "Variable"})
    
    print("Configuring Sample Savings Vaults...")
    await create_goal.ainvoke({"user_id": user_id, "title": "Tokyo October Trip", "target_amount": 3000.0})
    await create_goal.ainvoke({"user_id": user_id, "title": "Emergency Reserves", "target_amount": 10000.0})
    
    # We lack the explicitly deterministic short IDs natively fetched dynamically, so we won't fund goals in the seeder, 
    # letting the user test tool calls live via Chatbot natively.
    
    print("Seed Complete!")
    await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(seed())
