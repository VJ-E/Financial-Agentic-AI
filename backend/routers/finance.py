from fastapi import APIRouter, Header, HTTPException
import os
from backend.agent.tools import get_financial_data, add_transaction

router = APIRouter()

INGEST_API_KEY = os.getenv("INGEST_API_KEY", "your-secret-key-here")

@router.get("/finance")
async def get_finance():
    """
    Exposes the user's financial profile natively invoking the exact logic originally mapped 
    across the LangChain boundaries locally dynamically returning parsed data.
    """
    # Await the ainvoke of the pre-built tool
    response = await get_financial_data.ainvoke({"user_id": "user_123"})
    return response

@router.post("/finance/ingest")
async def ingest_gpay_transaction(
    payload: dict,
    x_api_key: str = Header(None)
):
    """
    Receives a parsed GPay transaction from the Android listener app
    and logs it automatically.
    """
    # Security check — reject requests without the key
    if x_api_key != INGEST_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    merchant = payload.get("merchant", "Unknown")
    amount = payload.get("amount", 0.0)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Auto-categorise by merchant name
    fixed_keywords = ["rent", "electricity", "jio", "airtel", "emi",
                      "insurance", "wifi", "bsnl", "broadband", "bescom"]
    category = "Fixed" if any(k in merchant.lower() for k in fixed_keywords) else "Variable"

    # Reuse the existing tool — no duplicate logic
    result = await add_transaction.ainvoke({
        "user_id": "user_123",
        "description": merchant,
        "amount": amount,
        "category": category
    })

    return result

