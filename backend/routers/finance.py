from fastapi import APIRouter
from backend.agent.tools import get_financial_data

router = APIRouter()

@router.get("/finance")
async def get_finance():
    """
    Exposes the user's financial profile natively invoking the exact logic originally mapped 
    across the LangChain boundaries locally dynamically returning parsed data.
    """
    # Await the ainvoke of the pre-built tool
    response = await get_financial_data.ainvoke({"user_id": "user_123"})
    return response

