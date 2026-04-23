"""
LangChain Text-to-SQL Agent.
Uses langchain_community SQLDatabase + ChatAnthropic to answer ad-hoc data questions
by autonomously querying the PostgreSQL database.
"""
import logging

from ..config import settings

log = logging.getLogger(__name__)


def get_sql_agent_response(question: str) -> str:
    if not settings.anthropic_api_key:
        return "Anthropic API key is required to run the SQL agent."

    try:
        from langchain_community.utilities import SQLDatabase
        from langchain_anthropic import ChatAnthropic
        from langchain_community.agent_toolkits import create_sql_agent
    except ImportError as exc:
        log.error("LangChain SQL agent dependencies missing: %s", exc)
        return (
            "The autonomous SQL agent requires langchain_community to be installed. "
            "Install it with: pip install langchain-community langchain-anthropic. "
            f"Your question was: {question}"
        )

    try:
        db = SQLDatabase.from_uri(settings.database_url)
        llm = ChatAnthropic(
            model="claude-haiku-4-5-20251001",
            api_key=settings.anthropic_api_key,
            temperature=0,
            max_tokens=1024,
        )
        agent = create_sql_agent(
            llm,
            db=db,
            verbose=False,
            max_iterations=10,
            handle_parsing_errors=True,
        )
        result = agent.invoke({"input": question})
        return result.get("output", str(result))
    except Exception as exc:
        log.error("SQL agent error for question %r: %s", question, exc)
        return (
            "The SQL agent encountered an error while processing your question. "
            "Please try rephrasing or use the standard AI explain feature."
        )
