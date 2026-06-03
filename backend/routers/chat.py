from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any
from backend.agent.graph import app_graph

router = APIRouter()

class ChatRequest(BaseModel):
    messages: List[Any]
    api_keys: List[str] = []

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Accepts raw unparsed messages arrays and injects them natively into LangGraph orchestrating
    the final textual reply for the user interface strictly.
    """
    async def generator():
        async for event in app_graph.astream_events({"messages": request.messages, "api_keys": request.api_keys}, version="v2"):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if hasattr(chunk, "content") and chunk.content:
                    yield f"data: {chunk.content}\n\n"
                    
    return StreamingResponse(generator(), media_type="text/event-stream")
