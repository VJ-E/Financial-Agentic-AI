from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any
from backend.agent.graph import app_graph
from backend.auth_utils import get_current_user
from backend.context import gemini_api_keys_var
import json

router = APIRouter(tags=["Chat & Agent"])

class ChatRequest(BaseModel):
    messages: List[Any]
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
        try:
            async for event in app_graph.astream_events(
                {"messages": request.messages, "api_keys": request.api_keys, "openrouter_api_keys": request.openrouter_api_keys, "user_id": user["user_id"]},
                version="v2"
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yielded_any = True
                        yield chunk.content
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield "\n\n[SYSTEM]: API validation error occurred while generating response. The agent engine blocked a malformed query. Please rephrase your question."
            yielded_any = True
            
        if not yielded_any:
            yield "\n\n[SYSTEM]: Connection interrupted or API Rate Limit Exceeded (100,000 tokens/day). The AI agent could not generate a response. Please check your Groq API limits or try again later."

    return StreamingResponse(generator(), media_type="text/plain")
