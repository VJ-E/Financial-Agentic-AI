from fastapi import APIRouter, Header, HTTPException, Depends, Request
import os
from backend.agent.tools import get_financial_data, add_transaction
from backend.auth_utils import get_current_user
from backend.context import gemini_api_keys_var
import json
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


class IngestRequest(BaseModel):
    merchant: str
    amount: float
    type: str = "expense"


@router.get("/finance")
async def get_finance(req: Request, user: dict = Depends(get_current_user)):
    """
    Exposes the authenticated user's financial profile.
    """
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

    response = await get_financial_data.ainvoke({"user_id": user["user_id"]})
    return response


@router.post("/finance/ingest")
async def ingest_gpay_transaction(
    payload: IngestRequest,
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

    merchant = payload.merchant
    amount = payload.amount
    txn_type = payload.type

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
async def get_pending_transactions(req: Request, user: dict = Depends(get_current_user)):
    """Fetches all transactions waiting in the queue for the authenticated user."""
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

    db = db_manager.db
    cursor = db.pending_transactions.find({"userId": user["user_id"]}).sort("createdAt", -1)
    pending = await cursor.to_list(length=100)
    for p in pending:
        p["_id"] = str(p["_id"])
    return {"success": True, "data": pending}


@router.post("/finance/pending/{tx_id}/approve")
async def approve_pending(req: Request, tx_id: str, payload: ApproveRequest, user: dict = Depends(get_current_user)):
    """Approves a pending transaction, injecting it into Qdrant and the true ledger."""
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

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
        "description": payload.description,
        "amount": payload.amount,
        "category": payload.category
    })

    await db.pending_transactions.delete_one({"_id": obj_id})
    return result


@router.delete("/finance/pending/{tx_id}/reject")
async def reject_pending(req: Request, tx_id: str, user: dict = Depends(get_current_user)):
    """Silently trashes a pending transaction."""
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

    db = db_manager.db
    try:
        obj_id = ObjectId(tx_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")

    await db.pending_transactions.delete_one({"_id": obj_id, "userId": user["user_id"]})
    return {"success": True, "message": "Transaction rejected."}


import uuid
import json
import google.generativeai as genai
from fastapi import UploadFile, File

@router.post("/finance/upload")
async def upload_image(req: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an image (receipt, screenshot), extract transactions using Gemini 1.5 Flash."""
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass
    
    api_keys = gemini_api_keys_var.get()
    if not api_keys:
        raise HTTPException(status_code=400, detail="Gemini API Key(s) required for image analysis.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    transactions = []
    
    last_error = "No valid API keys found"
    for key in api_keys:
        if not key.strip():
            continue
        try:
            genai.configure(api_key=key.strip())
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = '''
            Analyze this image (which could be a receipt, bill, or Google Pay screenshot) and extract all financial transactions.
            Return ONLY a JSON array of objects. Do not include any markdown formatting like ```json.
            Each object must have exactly these keys:
            - "merchant": A short string name of the vendor or person.
            - "amount": A positive float representing the monetary value.
            - "type": Either "expense" or "income".
            - "category": Either "Fixed", "Variable", or "Income".
            '''
            
            response = model.generate_content([
                {'mime_type': file.content_type, 'data': contents},
                prompt
            ])
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
                
            try:
                transactions = json.loads(text.strip())
                break
            except json.JSONDecodeError as jde:
                last_error = f"JSON Parse Error: {str(jde)} - Content: {text}"
                continue
        except Exception as e:
            last_error = f"Gemini Error: {str(e)}"
            print(last_error)
            continue

    if not transactions:
        raise HTTPException(status_code=500, detail=f"Failed to analyze image. Error: {last_error}")

    batch_id = str(uuid.uuid4())
    db = db_manager.db
    
    docs_to_insert = []
    for tx in transactions:
        docs_to_insert.append({
            "userId": user["user_id"],
            "batchId": batch_id,
            "description": tx.get("merchant", "Unknown"),
            "amount": float(tx.get("amount", 0)),
            "category": tx.get("category", "Variable"),
            "createdAt": datetime.datetime.utcnow()
        })
        
    if docs_to_insert:
        await db.pending_transactions.insert_many(docs_to_insert)

    return {
        "success": True,
        "batchId": batch_id,
        "count": len(docs_to_insert),
        "transactions": transactions
    }

@router.post("/finance/pending/batch/{batch_id}/approve")
async def approve_batch(req: Request, batch_id: str, user: dict = Depends(get_current_user)):
    """Approves all transactions in a batch."""
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass
        
    db = db_manager.db
    cursor = db.pending_transactions.find({"userId": user["user_id"], "batchId": batch_id})
    pending_txs = await cursor.to_list(length=100)
    
    approved_count = 0
    for tx in pending_txs:
        await add_transaction.ainvoke({
            "user_id": user["user_id"],
            "description": tx["description"],
            "amount": tx["amount"],
            "category": tx["category"]
        })
        await db.pending_transactions.delete_one({"_id": tx["_id"]})
        approved_count += 1
        
    return {"success": True, "message": f"Approved {approved_count} transactions."}

@router.delete("/finance/pending/batch/{batch_id}/reject")
async def reject_batch(req: Request, batch_id: str, user: dict = Depends(get_current_user)):
    """Discards all transactions in a batch."""
    db = db_manager.db
    result = await db.pending_transactions.delete_many({"userId": user["user_id"], "batchId": batch_id})
    return {"success": True, "message": f"Rejected {result.deleted_count} transactions."}

