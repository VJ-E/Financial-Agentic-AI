import os
from dotenv import load_dotenv

# Ensure environment is loaded locally relative to this script before any graph execution
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage

from backend.agent.state import AgentState
from backend.agent.tools import (
    get_financial_data,
    add_transaction,
    delete_transaction,
    update_transaction,
    create_goal,
    fund_goal,
    search_history,
    web_search,
    delete_goal
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
10. If the user asks for real-time information, market data, prices (e.g., gold, stocks), or news, YOU MUST use the 'web_search' tool to find the answer, then combine it with 'get_financial_data' (if they ask about their affordability) to give personalized advice.
11. FORMATTING: ALWAYS format your responses using Markdown. Use **bold** for numbers/balances, `#` or `##` for section headings, and `-` for bulleted lists. If summarizing large data (like transactions or goals), NEVER dump raw arrays. Instead, group them into a concise, beautifully structured bulleted list.
"""

tools = [
    get_financial_data,
    add_transaction,
    delete_transaction,
    update_transaction,
    create_goal,
    fund_goal,
    delete_goal,
    search_history,
    web_search
]

# 2. Define the Nodes
def chatbot(state: AgentState):
    """
    The central intelligence node. Evaluates input, reviews memory state, and interacts 
    with strictly bound system parameters.
    """
    messages = state["messages"]
    
    # CRITICAL FIX: Groq API often crashes (Failed to call a function) when older conversation turns 
    # contain ToolMessages or AIMessages with tool_calls. 
    # We filter out tool calls from previous turns to keep the context clean.
    last_human_idx = -1
    for i in range(len(messages) - 1, -1, -1):
        if messages[i].type == "human":
            last_human_idx = i
            break
            
    filtered_messages = []
    for i, m in enumerate(messages):
        if i < last_human_idx:
            if m.type == "tool":
                continue
            if m.type == "ai":
                if getattr(m, "tool_calls", None):
                    if not m.content:
                        continue
                    else:
                        from langchain_core.messages import AIMessage
                        m = AIMessage(content=m.content)
        filtered_messages.append(m)
        
    messages = filtered_messages
    
    frontend_keys = state.get("api_keys", [])
    valid_keys = [k for k in frontend_keys if k.strip()]
    
    if not valid_keys:
        # Fallback to backend environment variables if frontend didn't supply any
        groq_keys = [
            os.getenv("GROQ_API_KEY_1", os.getenv("GROQ_API_KEY")),
            os.getenv("GROQ_API_KEY_2"),
            os.getenv("GROQ_API_KEY_3")
        ]
        valid_keys = [k for k in groq_keys if k]
        if not valid_keys:
            valid_keys = ["missing_key"]

    all_runnables = []
    for key in valid_keys:
        all_runnables.append(ChatGroq(api_key=key, model="llama-3.3-70b-versatile", temperature=0, max_retries=1).bind_tools(tools))
        all_runnables.append(ChatGroq(api_key=key, model="llama3-8b-8192", temperature=0, max_retries=1).bind_tools(tools))

    # Add OpenRouter Fallbacks
    openrouter_keys = state.get("openrouter_api_keys", [])
    valid_or_keys = [k for k in openrouter_keys if k.strip()]
    for key in valid_or_keys:
        all_runnables.append(
            ChatOpenAI(
                base_url="https://openrouter.ai/api/v1", 
                api_key=key, 
                model="meta-llama/llama-3.3-70b-instruct", 
                temperature=0, 
                max_retries=1
            ).bind_tools(tools)
        )

    llm_with_tools = all_runnables[0].with_fallbacks(all_runnables[1:])
    
    # Prepend the strict system instructions right before evaluating new outputs 
    # guaranteeing rules are prioritized effectively alongside generic memory.
    user_id = state.get("user_id", "unknown")
    sys_instruction = SYSTEM_INSTRUCTION.strip() + f"\n\nCRITICAL: You are acting on behalf of user ID '{user_id}'. You MUST ALWAYS pass '{user_id}' EXACTLY as the user_id argument for all your tools."
    sys_msg = SystemMessage(content=sys_instruction)
    
    # Invoke model securely with bound capabilities
    try:
        response = llm_with_tools.invoke([sys_msg] + messages)
    except Exception as e:
        from langchain_core.messages import AIMessage
        print(f"LLM Invoke Error: {e}")
        # Fallback graceful response instead of crashing the backend
        response = AIMessage(content="[SYSTEM]: API validation error occurred while planning tool execution. The agent engine blocked a malformed tool call. Please rephrase your query directly.")
    
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
