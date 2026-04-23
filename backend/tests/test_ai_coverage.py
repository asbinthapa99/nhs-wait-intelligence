"""
Extended tests for AI endpoints and news service.
Covers agent-explain, ai-briefing, ai-insights, ai-stream, and news feed parsing.
"""
import json
from datetime import date
from unittest.mock import MagicMock, patch
from xml.etree import ElementTree as ET

import pytest

from app.models import ProcessedMetric, Region


# ── /api/agent-explain ────────────────────────────────────────────────────────

def test_agent_explain_no_api_key(client, monkeypatch):
    monkeypatch.setattr("app.routers.ai.settings.anthropic_api_key", "")
    r = client.post("/api/agent-explain", json={"question": "How many regions?"})
    assert r.status_code == 200
    data = r.json()
    assert "api key" in data["response"].lower()
    assert data["agentic"] is True


def test_agent_explain_empty_question(client):
    r = client.post("/api/agent-explain", json={"question": "   "})
    assert r.status_code == 422


def test_agent_explain_returns_response(client, monkeypatch):
    monkeypatch.setattr("app.routers.ai.settings.anthropic_api_key", "test-key")
    monkeypatch.setattr(
        "app.routers.ai.get_sql_agent_response",
        lambda q: "There are 7 NHS regions.",
    )
    r = client.post("/api/agent-explain", json={"question": "How many regions?"})
    assert r.status_code == 200
    data = r.json()
    assert data["response"] == "There are 7 NHS regions."
    assert data["agentic"] is True


def test_agent_explain_pii_scrubbed(client, monkeypatch):
    """question field in response reflects the privacy-vault-processed text."""
    monkeypatch.setattr("app.routers.ai.settings.anthropic_api_key", "test-key")
    captured = {}

    def fake_agent(q: str) -> str:
        captured["q"] = q
        return "ok"

    monkeypatch.setattr("app.routers.ai.get_sql_agent_response", fake_agent)
    r = client.post("/api/agent-explain", json={"question": "Tell me about London"})
    assert r.status_code == 200
    # The question should have passed through privacy_vault.scrub_text (no-op in test env)
    assert captured["q"] == "Tell me about London"


# ── /api/ai-briefing ─────────────────────────────────────────────────────────

def test_ai_briefing_empty_db(client):
    r = client.get("/api/ai-briefing")
    assert r.status_code == 200
    data = r.json()
    assert "sections" in data
    assert isinstance(data["sections"], list)


def test_ai_briefing_with_live_data(client, db, monkeypatch):
    db.add(Region(id=1, name="London", region_code="Y56", deprivation_index=0.55, population=9000000))
    db.add(ProcessedMetric(
        region_id=1,
        snapshot_month=date.today().replace(day=1),
        inequality_score=42.0,
        backlog_rate_per_100k=88.0,
        backlog_growth_rate=-1.0,
        total_waiting=340000,
        pct_over_18_weeks=49.0,
        trend="improving",
    ))
    db.commit()

    fake_briefing = {"sections": [{"heading": "Overview", "body": "All good."}]}
    monkeypatch.setattr(
        "app.routers.ai.get_executive_briefing",
        lambda db, ctx: (fake_briefing, False),
    )

    r = client.get("/api/ai-briefing")
    assert r.status_code == 200
    data = r.json()
    assert len(data["sections"]) == 1
    assert data["sections"][0]["heading"] == "Overview"


# ── /api/ai-insights ─────────────────────────────────────────────────────────

def test_ai_insights_valid_topics(client):
    for topic in ("overview", "inequality", "specialties", "trends"):
        r = client.get(f"/api/ai-insights?topic={topic}")
        assert r.status_code == 200, f"topic={topic} returned {r.status_code}"
        data = r.json()
        assert data["topic"] == topic
        assert isinstance(data["bullets"], list)


def test_ai_insights_invalid_topic(client):
    r = client.get("/api/ai-insights?topic=nonsense")
    assert r.status_code == 422


def test_ai_insights_with_live_data(client, db, monkeypatch):
    db.add(Region(id=2, name="Midlands", region_code="Y60", deprivation_index=0.65, population=10800000))
    db.add(ProcessedMetric(
        region_id=2,
        snapshot_month=date.today().replace(day=1),
        inequality_score=71.0,
        backlog_rate_per_100k=140.0,
        backlog_growth_rate=4.2,
        total_waiting=460000,
        pct_over_18_weeks=74.0,
        trend="deteriorating",
    ))
    db.commit()

    fake_bullets = [
        {"heading": "High pressure", "detail": "Midlands worst."},
        {"heading": "Trend up", "detail": "Growing fast."},
        {"heading": "Action needed", "detail": "Urgent review."},
    ]
    monkeypatch.setattr(
        "app.routers.ai.get_proactive_insights",
        lambda db, topic, ctx: (fake_bullets, False),
    )

    r = client.get("/api/ai-insights?topic=inequality")
    assert r.status_code == 200
    data = r.json()
    assert len(data["bullets"]) == 3
    assert data["bullets"][0]["heading"] == "High pressure"


# ── /api/ai-stream ────────────────────────────────────────────────────────────

def test_ai_stream_empty_question(client):
    r = client.post("/api/ai-stream", json={"question": "  "})
    assert r.status_code == 422


def test_ai_stream_too_long(client):
    r = client.post("/api/ai-stream", json={"question": "x" * 501})
    assert r.status_code == 422


def test_ai_stream_returns_sse(client, monkeypatch):
    def fake_stream(question, region, context, history):
        yield {"provider": "local"}
        yield "Hello "
        yield "world"

    monkeypatch.setattr("app.routers.ai.stream_ai_response", fake_stream)
    r = client.post("/api/ai-stream", json={"question": "What is the NHS backlog?"})
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    lines = [l for l in r.text.splitlines() if l.startswith("data:")]
    payloads = [json.loads(l[len("data: "):]) for l in lines]
    texts = [p["text"] for p in payloads if not p.get("done")]
    assert "Hello " in texts
    done_payload = next(p for p in payloads if p.get("done"))
    assert done_payload["provider"] == "local"


# ── News service ──────────────────────────────────────────────────────────────

def test_parse_rss_valid():
    from app.services.news import _parse_rss

    xml = """<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item>
        <title>NHS waiting lists rise again</title>
        <link>https://example.com/1</link>
        <description>Waiting times increased in March.</description>
        <pubDate>Thu, 01 Apr 2026 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>"""

    items = _parse_rss(xml, "Test Source")
    assert len(items) == 1
    assert items[0]["title"] == "NHS waiting lists rise again"
    assert items[0]["source"] == "Test Source"
    assert items[0]["url"] == "https://example.com/1"


def test_parse_rss_malformed_returns_empty():
    from app.services.news import _parse_rss

    items = _parse_rss("this is not xml <<<<<", "Test Source")
    assert items == []


def test_parse_rss_empty_items():
    from app.services.news import _parse_rss

    xml = """<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>"""
    items = _parse_rss(xml, "Test Source")
    assert items == []


def test_sql_agent_no_key():
    from app.services.agent import get_sql_agent_response
    import app.services.agent as agent_module

    original = agent_module.settings.anthropic_api_key
    try:
        agent_module.settings.__dict__["anthropic_api_key"] = ""
        result = get_sql_agent_response("How many regions?")
        assert "api key" in result.lower()
    finally:
        agent_module.settings.__dict__["anthropic_api_key"] = original


def test_pii_protector_passthrough():
    from app.core.privacy import PIIProtector

    p = PIIProtector()
    assert p.scrub_text("hello world") == "hello world"
    assert p.scrub_text("") == ""
    assert p.scrub_text(None) is None  # type: ignore[arg-type]
