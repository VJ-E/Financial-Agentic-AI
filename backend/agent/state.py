from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage

class AgentState(TypedDict):
    """
    The state schema for the Financial Agent LangGraph.
    
    The 'messages' field utilizes the `add_messages` reducer to essentially
    append messages to the list instead of overwriting the previous state exactly.
    """
    messages: Annotated[list[AnyMessage], add_messages]
    api_keys: list[str]
    openrouter_api_keys: list[str]
    user_id: str
