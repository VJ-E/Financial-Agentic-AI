from fastapi import APIRouter, Header, HTTPException, Depends
import os
from backend.agent.tools import get_financial_data, add_transaction
from backend.auth_utils import get_current_user
from pydantic import BaseModel
from bson import ObjectId
import datetime
from backend.db.mongo import db_manager

router = APIRouter()

INGEST_API_KEY = os.getenv("INGEST_API_KEY", "your-secret-key-here")


class ApproveRequest(BaseModel):
    description: str
    amount: float
    category: str


@router.get("/finance")
async def get_finance(user: dict = Depends(get_current_user)):
    """
    Exposes the authenticated user's financial profile.
    """
    response = await get_financial_data.ainvoke({"user_id": user["user_id"]})
    return response


@router.post("/finance/ingest")
async def ingest_gpay_transaction(
    payload: dict,
    x_api_key: str = Header(None),
    x_user_id: str = Header(None),
):
    """
    Receives a parsed GPay transaction from the Android listener app
    and logs it to the Pending Queue automatically.
    The Android app sends the user's ID via X-User-Id header.
    """
    if x_api_key != INGEST_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not x_user_id:
        raise HTTPException(status_code=400, detail="Missing X-User-Id header. Configure your User ID in the Android app settings.")

    merchant = payload.get("merchant", "Unknown")
    amount = payload.get("amount", 0.0)
    txn_type = payload.get("type", "expense")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    if txn_type == "income":
        category = "Income"
    else:
        fixed_keywords = ["rent", "electricity", "jio", "airtel", "emi",
                          "insurance", "wifi", "bsnl", "broadband", "bescom"]
        category = "Fixed" if any(k in merchant.lower() for k in fixed_keywords) else "Variable"

    db = db_manager.db
    pending_doc = {
        "userId": x_user_id,
        "description": merchant,
        "amount": amount,
        "category": category,
        "createdAt": datetime.datetime.utcnow()
    }

    await db.pending_transactions.insert_one(pending_doc)
    return {"success": True, "message": "Transaction queued for approval."}


@router.get("/finance/pending")
async def get_pending_transactions(user: dict = Depends(get_current_user)):
    """Fetches all transactions waiting in the queue for the authenticated user."""
    db = db_manager.db
    cursor = db.pending_transactions.find({"userId": user["user_id"]}).sort("createdAt", -1)
    pending = await cursor.to_list(length=100)
    for p in pending:
        p["_id"] = str(p["_id"])
    return {"success": True, "data": pending}


@router.post("/finance/pending/{tx_id}/approve")
async def approve_pending(tx_id: str, req: ApproveRequest, user: dict = Depends(get_current_user)):
    """Approves a pending transaction, injecting it into Qdrant and the true ledger."""
    db = db_manager.db

    try:
        obj_id = ObjectId(tx_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    tx = await db.pending_transactions.find_one({"_id": obj_id, "userId": user["user_id"]})
    if not tx:
        raise HTTPException(status_code=404, detail="Pending transaction not found")

    result = await add_transaction.ainvoke({
        "user_id": user["user_id"],
        "description": req.description,
        "amount": req.amount,
        "category": req.category
    })

    await db.pending_transactions.delete_one({"_id": obj_id})
    return result


@router.delete("/finance/pending/{tx_id}/reject")
async def reject_pending(tx_id: str, user: dict = Depends(get_current_user)):
    """Silently trashes a pending transaction."""
    db = db_manager.db
    try:
        obj_id = ObjectId(tx_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    await db.pending_transactions.delete_one({"_id": obj_id, "userId": user["user_id"]})
    return {"success": True, "message": "Transaction rejected."}
