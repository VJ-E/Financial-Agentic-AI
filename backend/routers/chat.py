from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any
from backend.agent.graph import app_graph
from backend.auth_utils import get_current_user
from backend.context import gemini_api_keys_var
from backend.db.mongo import db_manager
from backend.db.revert import execute_revert_action
import json
import datetime

router = APIRouter(tags=["Chat & Agent"])

class ChatRequest(BaseModel):
    messages: List[Any]
    chat_id: str = ""
    api_keys: List[str] = []
    openrouter_api_keys: List[str] = []

@router.post("/chat")
async def chat_endpoint(req: Request, request: ChatRequest, user: dict = Depends(get_current_user)):
    """
    Accepts raw messages and injects them into LangGraph, scoped to the authenticated user.
    """
    # Extract Gemini API keys from headers
    gemini_keys_str = req.headers.get("X-Gemini-Api-Keys")
    if gemini_keys_str:
        try:
            keys = json.loads(gemini_keys_str)
            gemini_api_keys_var.set(keys)
        except json.JSONDecodeError:
            pass

    async def generator():
        yielded_any = False
        full_response = ""
        try:
            # Inject chat_id via configurable
            config = {"configurable": {"chat_id": request.chat_id, "user_id": user["user_id"]}}
            
            async for event in app_graph.astream_events(
                {"messages": request.messages, "api_keys": request.api_keys, "openrouter_api_keys": request.openrouter_api_keys, "user_id": user["user_id"]},
                config=config,
                version="v2"
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yielded_any = True
                        full_response += chunk.content
                        yield chunk.content
        except Exception as e:
            print(f"Streaming Error: {e}")
            err_msg = "\n\n[SYSTEM]: API validation error occurred while generating response. The agent engine blocked a malformed query. Please rephrase your question."
            full_response += err_msg
            yield err_msg
            yielded_any = True
            
        if not yielded_any:
            err_msg = "\n\n[SYSTEM]: Connection interrupted or API Rate Limit Exceeded (100,000 tokens/day). The AI agent could not generate a response. Please check your Groq API limits or try again later."
            full_response += err_msg
            yield err_msg

        # Save to DB after streaming completes
        if db_manager.db is not None:
            updated_messages = request.messages.copy()
            updated_messages.append({"role": "assistant", "content": full_response, "chatId": request.chat_id})
            
            # Keep only last 10 messages (5 pairs)
            if len(updated_messages) > 10:
                updated_messages = updated_messages[-10:]
                
            await db_manager.db.chat_history.update_one(
                {"userId": user["user_id"]},
                {"$set": {"messages": updated_messages, "updatedAt": datetime.datetime.utcnow()}},
                upsert=True
            )

    return StreamingResponse(generator(), media_type="text/plain")

@router.get("/finance/chat/history")
async def get_chat_history(user: dict = Depends(get_current_user)):
    if db_manager.db is None:
        return {"success": False, "messages": []}
    
    doc = await db_manager.db.chat_history.find_one({"userId": user["user_id"]})
    if doc and "messages" in doc:
        return {"success": True, "messages": doc["messages"]}
    return {"success": True, "messages": []}

class UndoRequest(BaseModel):
    chat_id: str

@router.post("/finance/chat/undo")
async def undo_chat_actions(request: UndoRequest, user: dict = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        return {"success": False, "message": "Database disconnected"}
        
    user_id = user["user_id"]
    chat_id = request.chat_id
    
    doc = await db.chat_history.find_one({"userId": user_id})
    if doc and "messages" in doc:
        messages = doc["messages"]
        target_idx = -1
        for i, msg in enumerate(messages):
            if msg.get("chatId") == chat_id:
                target_idx = i
                break
                
        if target_idx != -1:
            new_messages = messages[:target_idx]
            await db.chat_history.update_one(
                {"userId": user_id},
                {"$set": {"messages": new_messages}}
            )
            
    first_log = await db.revert_logs.find_one({"userId": user_id, "chatId": chat_id}, sort=[("timestamp", 1)])
    
    if first_log:
        target_timestamp = first_log["timestamp"]
        cursor = db.revert_logs.find({"userId": user_id, "timestamp": {"$gte": target_timestamp}}).sort("timestamp", -1)
        logs = await cursor.to_list(length=None)
        
        for log in logs:
            await execute_revert_action(user_id, log)
            
        log_ids = [l["_id"] for l in logs]
        if log_ids:
            await db.revert_logs.delete_many({"_id": {"$in": log_ids}})
            
    return {"success": True, "message": "Revert successful"}

