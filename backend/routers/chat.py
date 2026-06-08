from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any
from backend.agent.graph import app_graph
from backend.auth_utils import get_current_user

router = APIRouter()

class ChatRequest(BaseModel):
    messages: List[Any]
    api_keys: List[str] = []

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, user: dict = Depends(get_current_user)):
    """
    Accepts raw messages and injects them into LangGraph, scoped to the authenticated user.
    """
    async def generator():
        async for event in app_graph.astream_events(
            {"messages": request.messages, "api_keys": request.api_keys, "user_id": user["user_id"]},
            version="v2"
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, "content") and chunk.content:
                    yield f"data: {chunk.content}\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")
