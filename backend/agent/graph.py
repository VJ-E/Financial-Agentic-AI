import os
from dotenv import load_dotenv

# Ensure environment is loaded locally relative to this script before any graph execution
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage

from backend.agent.state import AgentState
from backend.agent.tools import (
    get_financial_data,
    add_transaction,
    delete_transaction,
    update_transaction,
    create_goal,
    fund_goal,
    search_history
)

# Neo-Brutalist System Prompt migrated directly from the original Next.js AI API
SYSTEM_INSTRUCTION = """
You are a highly strict, agentic financial advisor operating via a secure terminal interface.
Your job is to analyze the user's finances and execute the appropriate system tool.

CRITICAL RULES:
1. NEVER calculate the user's balance yourself. You are terrible at math. ALWAYS wait for the tool to execute, read the newBalance value returned by the tool, and quote that exact number in your final response.
2. Hypotheticals vs. Actions: If the user asks 'Can I afford X?' or 'Should I buy Y?', DO NOT call a modification tool. Instead, call 'get_financial_data', analyze their balance, and give them financial advice in a brutalist, direct tone. Only log a transaction if the user explicitly confirms they made the purchase.
3. If the user asks about their balance, spending, or financial summary, YOU MUST call 'get_financial_data'.
4. Concrete Actions: If the user explicitly wants to record spending, add income, or log a transaction, YOU MUST call 'add_transaction'.
   - Allowed categories: 'Fixed', 'Variable', 'Income'.
5. RULE: If the user is buying something or paying a bill, use add_transaction. IF the user wants to set money aside, save for a target, or stash funds in a vault, you MUST use fund_goal. If they want to start a new savings target, use create_goal.
6. Corrections: If the user says they made a mistake, use 'update_transaction' or 'delete_transaction' as appropriate.
   - IMPORTANT: The frontend only shows the last 4 characters of an ID (e.g., "#A7F2"). 
   - If the user provides a short 4-character ID, YOU MUST first call 'get_financial_data' to retrieve the recent transaction array and find the matching full MongoDB '_id' strings BEFORE calling delete or update.
7. After executing a tool, provide a concise, brutalist-style confirmation message summarizing the system's action or providing your stark financial advice.
8. Never invent tools or output raw JSON to the user.
9. The default currency for all transactions, balances, and advice is the Indian Rupee (INR / ₹). Never refer to dollars or $.
"""

# 1. Setup the LLM and Bind Tools
# We specify the advanced 70b model, robust at accurately calling multiple tools.
# Implement fault tolerance bypassing free-tier rate limits via multi-key iterations.
groq_keys = [
    os.getenv("GROQ_API_KEY_1", os.getenv("GROQ_API_KEY")),
    os.getenv("GROQ_API_KEY_2"),
    os.getenv("GROQ_API_KEY_3")
]
valid_keys = [k for k in groq_keys if k]
if not valid_keys:
    valid_keys = ["missing_key"]

llms = [ChatGroq(api_key=key, model="llama-3.3-70b-versatile", temperature=0) for key in valid_keys]

tools = [
    get_financial_data,
    add_transaction,
    delete_transaction,
    update_transaction,
    create_goal,
    fund_goal,
    search_history
]

# Note: Fallbacks on bound tools are processed significantly more securely natively 
# executing binding sequentially on each engine before compiling the chain.
llms_with_tools = [llm.bind_tools(tools) for llm in llms]
primary_llm = llms_with_tools[0]

if len(llms_with_tools) > 1:
    llm_with_tools = primary_llm.with_fallbacks(llms_with_tools[1:])
else:
    llm_with_tools = primary_llm

# 2. Define the Nodes
def chatbot(state: AgentState):
    """
    The central intelligence node. Evaluates input, reviews memory state, and interacts 
    with strictly bound system parameters.
    """
    messages = state["messages"]
    
    # Prepend the strict system instructions right before evaluating new outputs 
    # guaranteeing rules are prioritized effectively alongside generic memory.
    sys_instruction = SYSTEM_INSTRUCTION.strip() + "\n\nCRITICAL: You are acting on behalf of user ID 'user_123'. You MUST ALWAYS pass 'user_123' EXACTLY as the user_id argument for all your tools."
    sys_msg = SystemMessage(content=sys_instruction)
    
    # Invoke model securely with bound capabilities
    response = llm_with_tools.invoke([sys_msg] + messages)
    
    return {"messages": [response]}

# Initialize the generic Prebuilt ToolNode taking the mapped array of actions
tools_node = ToolNode(tools=tools)

# 3. Compile the Graph
graph_builder = StateGraph(AgentState)

graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", tools_node)

# Flow Setup
graph_builder.add_edge(START, "chatbot")

# Evaluates whether a tool_call was invoked in the latest AI response. 
# Routes cleanly to "tools" natively built node OR cascades to END.
graph_builder.add_conditional_edges(
    "chatbot",
    tools_condition,
)

# After finishing executing an external operation, the flow strictly cycles back 
# to 'chatbot' allowing the agent to visualize the resulting output strings.
graph_builder.add_edge("tools", "chatbot")

# Compile resolving to the memory-bounded runtime App instance
app_graph = graph_builder.compile()
