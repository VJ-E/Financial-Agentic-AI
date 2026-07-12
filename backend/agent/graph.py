import os
from dotenv import load_dotenv

# Ensure environment is loaded locally relative to this script before any graph execution
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage

from backend.agent.state import AgentState
from backend.db.mongo import db_manager
from backend.agent.tools import (
    get_financial_data,
    add_transaction,
    delete_transaction,
    update_transaction,
    create_goal,
    fund_goal,
    search_history,
    web_search,
    delete_goal,
    update_memory,
    tax_calculator,
    investment_analyzer,
    audit_subscriptions,
    calculate_emergency_fund,
    review_spending,
    track_financial_goal,
    detect_lifestyle_creep,
    calculate_net_worth
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
   - IMPORTANT: You MUST provide a 'type' ('debit' or 'credit').
   - IMPORTANT: You MUST provide a 'category' string. Use existing categories from the user profile if possible, otherwise invent a concise noun (e.g. 'Food', 'Transport', 'Salary').
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

PLAYBOOKS = {
    "CORE_SKILL": [get_financial_data, add_transaction, delete_transaction, update_transaction, calculate_net_worth],
    "GOAL_SKILL": [get_financial_data, create_goal, fund_goal, delete_goal, track_financial_goal, calculate_emergency_fund],
    "RESEARCH_SKILL": [get_financial_data, web_search, search_history, update_memory],
    "TAX_SKILL": [get_financial_data, tax_calculator],
    "INVESTMENT_SKILL": [get_financial_data, investment_analyzer, web_search],
    "BUDGET_SKILL": [get_financial_data, audit_subscriptions, review_spending, detect_lifestyle_creep]
}

ALL_TOOLS = []
for p in PLAYBOOKS.values():
    ALL_TOOLS.extend(p)
ALL_TOOLS = list({t.name: t for t in ALL_TOOLS}.values())

async def router_node(state: AgentState):
    """
    Lightning fast router to select the playbook and load user context.
    """
    messages = state.get("messages", [])
    if not messages:
        return {"active_skill": "CORE_SKILL", "user_context": ""}
        
    last_msg = messages[-1].content if messages else ""
    user_id = state.get("user_id", "unknown")
    
    # Simple heuristic routing for speed and zero-token usage
    lower_msg = str(last_msg).lower()
    active_skill = "CORE_SKILL"
    if "tax" in lower_msg or "deduction" in lower_msg or "80c" in lower_msg:
        active_skill = "TAX_SKILL"
    elif any(k in lower_msg for k in ["invest", "stock", "nifty", "return", "cagr", "mutual fund", "sip"]):
        active_skill = "INVESTMENT_SKILL"
    elif any(k in lower_msg for k in ["goal", "save for", "vault", "target", "emergency"]):
        active_skill = "GOAL_SKILL"
    elif any(k in lower_msg for k in ["budget", "spending", "subscription", "recurring", "creep", "lifestyle"]):
        active_skill = "BUDGET_SKILL"
    elif any(k in lower_msg for k in ["search", "remember", "news", "preference", "forget"]):
        active_skill = "RESEARCH_SKILL"
        
    # Fetch user memory
    user_context = ""
    if db_manager.db is not None:
        profile = await db_manager.db.userprofiles.find_one({"userId": user_id})
        if profile and "preferences" in profile:
            prefs = profile["preferences"]
            user_context = ", ".join([f"{k}: {v}" for k, v in prefs.items()])
            
    return {"active_skill": active_skill, "user_context": user_context}

def chatbot(state: AgentState):
    """
    The central intelligence node. Evaluates input, reviews memory state, and interacts 
    with strictly bound system parameters based on the active playbook.
    """
    messages = state["messages"]
    
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
                        m = AIMessage(content=m.content)
        filtered_messages.append(m)
        
    messages = filtered_messages
    
    frontend_keys = state.get("api_keys", [])
    valid_keys = [k for k in frontend_keys if k.strip()]
    
    if not valid_keys:
        groq_keys = [
            os.getenv("GROQ_API_KEY_1", os.getenv("GROQ_API_KEY")),
            os.getenv("GROQ_API_KEY_2"),
            os.getenv("GROQ_API_KEY_3")
        ]
        valid_keys = [k for k in groq_keys if k]
        if not valid_keys:
            valid_keys = ["missing_key"]

    active_skill = state.get("active_skill", "CORE_SKILL")
    skill_tools = PLAYBOOKS.get(active_skill, PLAYBOOKS["CORE_SKILL"])

    all_runnables = []
    for key in valid_keys:
        all_runnables.append(ChatGroq(api_key=key, model="openai/gpt-oss-20b", temperature=0, max_retries=1).bind_tools(skill_tools))
        all_runnables.append(ChatGroq(api_key=key, model="llama3-8b-8192", temperature=0, max_retries=1).bind_tools(skill_tools))

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
            ).bind_tools(skill_tools)
        )

    llm_with_tools = all_runnables[0].with_fallbacks(all_runnables[1:])
    
    user_id = state.get("user_id", "unknown")
    user_context = state.get("user_context", "")
    context_str = f"USER PREFERENCES (LONG-TERM MEMORY):\n{user_context}" if user_context else ""
    sys_instruction = SYSTEM_INSTRUCTION.strip() + f"\n\n{context_str}\n\nCRITICAL: You are acting on behalf of user ID '{user_id}'. You MUST ALWAYS pass '{user_id}' EXACTLY as the user_id argument for all your tools."
    
    # Also inject the active skill so the LLM knows its persona
    sys_instruction += f"\n\nACTIVE PLAYBOOK: {active_skill}"
    
    sys_msg = SystemMessage(content=sys_instruction)
    
    try:
        response = llm_with_tools.invoke([sys_msg] + messages)
    except Exception as e:
        print(f"LLM Invoke Error: {e}")
        response = AIMessage(content="[SYSTEM]: API validation error occurred while planning tool execution. The agent engine blocked a malformed tool call. Please rephrase your query directly.")
    
    return {"messages": [response]}

# Initialize the generic Prebuilt ToolNode with ALL possible tools so it can execute whatever the LLM requested
tools_node = ToolNode(tools=ALL_TOOLS)

graph_builder = StateGraph(AgentState)

graph_builder.add_node("router", router_node)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", tools_node)

graph_builder.add_edge(START, "router")
graph_builder.add_edge("router", "chatbot")

graph_builder.add_conditional_edges(
    "chatbot",
    tools_condition,
)

graph_builder.add_edge("tools", "chatbot")

app_graph = graph_builder.compile()
