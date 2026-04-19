"""
Multi-Agent LangGraph system.
ReAct Workflow: Data Engineer Agent -> Data Analyst Agent -> Policy Agent
"""
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from ..config import settings

class AgentState(TypedDict):
    input: str
    messages: Annotated[Sequence[BaseMessage], operator.add]
    sql_result: str
    clinical_context: str

def data_engineer_node(state: AgentState):
    """Generates complex SQL using Claude."""
    llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", anthropic_api_key=settings.anthropic_api_key)
    msg = llm.invoke(f"Write a SQL query to answer this data request: {state['input']}. Output purely the SQL.")
    return {"messages": [AIMessage(content=msg.content)], "sql_result": msg.content}

def data_analyst_node(state: AgentState):
    """Reviews the SQL result for statistical anomalies."""
    llm = ChatAnthropic(model="claude-3-haiku-20240307", anthropic_api_key=settings.anthropic_api_key)
    msg = llm.invoke(f"Act as a Data Quality Analyst. Review this SQL and output for logical fallacies: {state['sql_result']}")
    return {"messages": [AIMessage(content=msg.content)]}

def policy_agent_node(state: AgentState):
    """Contextualizes the pure mathematical data against NHS constitutional policies."""
    llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", anthropic_api_key=settings.anthropic_api_key)
    msg = llm.invoke(f"Contextualize these findings under the NHS 18-week RTT mandate: {state['messages'][-1].content}")
    return {"clinical_context": msg.content}

def build_supervisor_graph():
    """Compiles the LangGraph flow."""
    workflow = StateGraph(AgentState)
    
    workflow.add_node("DataEngineer", data_engineer_node)
    workflow.add_node("DataAnalyst", data_analyst_node)
    workflow.add_node("PolicyAgent", policy_agent_node)
    
    workflow.set_entry_point("DataEngineer")
    workflow.add_edge("DataEngineer", "DataAnalyst")
    workflow.add_edge("DataAnalyst", "PolicyAgent")
    workflow.add_edge("PolicyAgent", END)
    
    return workflow.compile()

def run_multi_agent_query(question: str):
    app = build_supervisor_graph()
    result = app.invoke({"input": question, "messages": []})
    return result["clinical_context"]
