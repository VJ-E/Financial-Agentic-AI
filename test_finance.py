import asyncio
from backend.db.mongo import db_manager
from backend.agent.tools import get_financial_data

async def main():
    await db_manager.connect_to_database()
    try:
        response = await get_financial_data.ainvoke({"user_id": "user_123"})
        print(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        await db_manager.close_database_connection()

if __name__ == "__main__":
    asyncio.run(main())
