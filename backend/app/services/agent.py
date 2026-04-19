"""
LangChain Text-to-SQL Agent stub.
langchain_community is not installed; this stub returns a clear message
so the rest of the API remains functional.
"""
from ..config import settings


def get_sql_agent_response(question: str) -> str:
    """Stub: LangChain SQL agent is unavailable (langchain_community not installed)."""
    if not settings.anthropic_api_key:
        return "Anthropic API key is required to run the SQL agent."
    return (
        "The autonomous SQL agent requires langchain_community to be installed. "
        "Install it with: pip install langchain-community langchain-anthropic langgraph. "
        f"Your question was: {question}"
    )
