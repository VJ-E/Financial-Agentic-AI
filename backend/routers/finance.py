from fastapi import APIRouter, Header, HTTPException, Depends, Request
import os
from backend.agent.tools import get_financial_data, add_transaction, update_transaction, delete_transaction
from backend.auth_utils import get_current_user
from backend.context import gemini_api_keys_var
import json
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
import datetime
from backend.db.mongo import db_manager
from backend.db.vector import delete_all_transactions

router = APIRouter()

INGEST_API_KEY = os.getenv("INGEST_API_KEY", "your-secret-key-here")


class ApproveRequest(BaseModel):
    name: str
    description: str = ""
    amount: float
    category: str


class BalanceUpdateRequest(BaseModel):
    source: str
    amount: float


class TransactionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    source: Optional[str] = None

class ApiKeysRequest(BaseModel):
    groq: list[str]
    gemini: list[str]
    openRouter: list[str]


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
        "name": merchant,
        "description": "",
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


@router.put("/finance/transaction/{tx_id}")
async def update_tx(req: Request, tx_id: str, payload: TransactionUpdateRequest, user: dict = Depends(get_current_user)):
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

    result = await update_transaction.ainvoke({
        "user_id": user["user_id"],
        "transaction_id": tx_id,
        "new_amount": payload.amount,
        "new_name": payload.name,
        "new_description": payload.description,
        "new_category": payload.category,
        "new_source": payload.source
    })
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.delete("/finance/transaction/{tx_id}")
async def delete_tx(req: Request, tx_id: str, user: dict = Depends(get_current_user)):
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            gemini_api_keys_var.set(json.loads(gemini_keys_str))
        except:
            pass

    result = await delete_transaction.ainvoke({
        "user_id": user["user_id"],
        "transaction_id": tx_id
    })
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


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
        "name": payload.name,
        "description": payload.description,
        "amount": payload.amount,
        "category": payload.category,
        "date": str(tx.get("createdAt")) if tx.get("createdAt") else None
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

@router.get("/finance/keys")
async def get_keys(user: dict = Depends(get_current_user)):
    db = db_manager.db
    profile = await db.userprofiles.find_one({"userId": user["user_id"]})
    if not profile or "apiKeys" not in profile:
        return {"success": True, "data": {"groq": [], "gemini": [], "openRouter": []}}
    return {"success": True, "data": profile["apiKeys"]}

@router.put("/finance/keys")
async def update_keys(payload: ApiKeysRequest, user: dict = Depends(get_current_user)):
    db = db_manager.db
    keys_doc = {
        "groq": payload.groq,
        "gemini": payload.gemini,
        "openRouter": payload.openRouter
    }
    await db.userprofiles.update_one(
        {"userId": user["user_id"]},
        {"$set": {"apiKeys": keys_doc}},
        upsert=True
    )
    return {"success": True, "message": "API keys updated successfully."}


@router.put("/finance/balance")
async def update_balance(payload: BalanceUpdateRequest, user: dict = Depends(get_current_user)):
    """Manually overrides the balance for bank or cash and recalculates total balance."""
    db = db_manager.db
    source = payload.source.lower()
    if source not in ["bank", "cash", "all"]:
        raise HTTPException(status_code=400, detail="Invalid source.")
        
    profile = await db.userprofiles.find_one({"userId": user["user_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    bank_balance = profile.get("bankBalance", profile.get("totalBalance", 0.0))
    cash_balance = profile.get("cashBalance", 0.0)
    
    if source == "bank":
        bank_balance = payload.amount
    elif source == "cash":
        cash_balance = payload.amount
    else:
        # For 'all', we might just set bank balance to amount and cash to 0 to make total = amount.
        # Or proportional. Let's just set bank to amount and cash to 0.
        bank_balance = payload.amount
        cash_balance = 0.0
        
    total_balance = bank_balance + cash_balance
    
    await db.userprofiles.update_one(
        {"userId": user["user_id"]},
        {"$set": {
            "bankBalance": bank_balance,
            "cashBalance": cash_balance,
            "totalBalance": total_balance,
            "updatedAt": datetime.datetime.utcnow()
        }}
    )
    return {"success": True, "message": "Balance updated successfully.", "data": {"totalBalance": total_balance, "bankBalance": bank_balance, "cashBalance": cash_balance}}

@router.delete("/finance/nuke")
async def nuke_account_data(user: dict = Depends(get_current_user)):
    """Wipes all transactions, pending queue, vector data, and resets balances to 0 for the user."""
    db = db_manager.db
    user_id = user["user_id"]
    
    # 1. Delete all standard transactions
    await db.transactions.delete_many({"userId": user_id})
    
    # 2. Delete all pending transactions
    await db.pending_transactions.delete_many({"userId": user_id})
    
    # 3. Wipe Qdrant vector database records
    delete_all_transactions(user_id)
    
    # 4. Reset User Profile Balances to 0
    await db.userprofiles.update_one(
        {"userId": user_id},
        {"$set": {
            "bankBalance": 0.0,
            "cashBalance": 0.0,
            "totalBalance": 0.0,
            "monthlyIncome": 0.0,
            "updatedAt": datetime.datetime.utcnow()
        }}
    )
    
    return {"success": True, "message": "All financial data has been wiped successfully."}
