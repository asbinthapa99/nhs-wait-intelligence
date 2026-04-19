import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from ..database import get_db
from ..models import ProcessedMetric, Region
from ..schemas.responses import (
    AIRequest, AIResponse, AIDataContext,
    AIInsightBullet, AIInsightsResponse,
    AIBriefingResponse, BriefingSection,
)
from ..services.ai_explain import get_ai_response, get_executive_briefing, get_proactive_insights, stream_ai_response
from ..services.agent import get_sql_agent_response
from ..core.privacy import privacy_vault
from ..config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _no_data_context(region_name: str | None) -> tuple[dict, AIDataContext | None]:
    if region_name:
        return ({"data_available": False, "region": region_name}, None)
    return ({"data_available": False}, None)


def _build_context(db: Session, region_name: str | None) -> tuple[dict, AIDataContext | None]:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if not latest_month:
        return _no_data_context(region_name)

    query = db.query(ProcessedMetric, Region).join(Region)
    if region_name:
        query = query.filter(Region.name == region_name)
    query = query.filter(ProcessedMetric.snapshot_month == latest_month)

    rows = query.all()
    if not rows:
        return _no_data_context(region_name)

    if region_name and rows:
        m, r = rows[0]
        context = {
            "data_available": True,
            "region": r.name,
            "inequality_score": m.inequality_score,
            "pct_over_18_weeks": m.pct_over_18_weeks,
            "deprivation_index": r.deprivation_index,
            "trend": m.trend,
            "total_waiting": m.total_waiting,
            "backlog_rate_per_100k": m.backlog_rate_per_100k,
        }
        data_ctx = AIDataContext(
            inequality_score=m.inequality_score,
            pct_over_18_weeks=m.pct_over_18_weeks,
            deprivation_index=r.deprivation_index,
            trend=m.trend,
        )
    else:
        all_scores = [m.inequality_score for m, _ in rows]
        all_pcts = [m.pct_over_18_weeks for m, _ in rows]
        context = {
            "data_available": True,
            "national_total_waiting": sum(m.total_waiting for m, _ in rows),
            "avg_pct_over_18_weeks": round(sum(all_pcts) / len(all_pcts), 1),
            "regional_gap_ratio": round(max(all_scores) / min(all_scores), 1) if min(all_scores) > 0 else 0,
            "worst_region": max(rows, key=lambda x: x[0].inequality_score)[1].name,
            "best_region": min(rows, key=lambda x: x[0].inequality_score)[1].name,
            "regions_deteriorating": sum(1 for m, _ in rows if m.trend == "deteriorating"),
        }
        data_ctx = None

    return context, data_ctx


def _fallback_ai_response(question: str, region: str | None, context: dict) -> str:
    from ..services.local_ai import generate_advanced_fallback_response
    return generate_advanced_fallback_response(question, region, context)


@router.post("/ai-explain", response_model=AIResponse)
@limiter.limit(settings.ai_rate_limit)
async def ai_explain(
    request: Request,
    payload: AIRequest,
    db: Session = Depends(get_db),
) -> AIResponse:
    if not payload.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    if len(payload.question) > 500:
        raise HTTPException(status_code=422, detail="Question must be under 500 characters")

    context, data_ctx = _build_context(db, payload.region)

    if not settings.anthropic_api_key:
        return AIResponse(
            region=payload.region,
            question=payload.question,
            response=_fallback_ai_response(payload.question, payload.region, context),
            data_context=data_ctx,
            cached=False,
        )

    history = [{"role": m.role, "content": m.content} for m in payload.history]
    try:
        response_text, cached = get_ai_response(db, payload.question, payload.region, context, history)
    except Exception as e:
        print(f"AI Explain API Error: {e}")
        response_text = _fallback_ai_response(payload.question, payload.region, context)
        cached = False

    return AIResponse(
        region=payload.region,
        question=payload.question,
        response=response_text,
        data_context=data_ctx,
        cached=cached,
    )


@router.post("/ai-stream")
@limiter.limit(settings.ai_rate_limit)
async def ai_stream(
    request: Request,
    payload: AIRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Server-Sent Events streaming endpoint for real-time AI responses."""
    if not payload.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    if len(payload.question) > 500:
        raise HTTPException(status_code=422, detail="Question must be under 500 characters")

    context, _ = _build_context(db, payload.region)

    if not settings.anthropic_api_key:
        async def _fallback():
            yield "data: " + json.dumps(
                {"text": _fallback_ai_response(payload.question, payload.region, context), "done": False}
            ) + "\n\n"
            yield "data: " + json.dumps({"done": True}) + "\n\n"
        return StreamingResponse(_fallback(), media_type="text/event-stream")

    history = [{"role": m.role, "content": m.content} for m in payload.history]

    def _generate():
        try:
            for chunk in stream_ai_response(payload.question, payload.region, context, history):
                yield "data: " + json.dumps({"text": chunk, "done": False}) + "\n\n"
            yield "data: " + json.dumps({"done": True}) + "\n\n"
        except Exception as e:
            print(f"AI Stream API Error: {e}")
            yield "data: " + json.dumps({
                "text": "\n\n*[API Limit Reached - Switching to Fallback Mode]*\n\n" + _fallback_ai_response(payload.question, payload.region, context),
                "done": False
            }) + "\n\n"
            yield "data: " + json.dumps({"done": True}) + "\n\n"

    return StreamingResponse(_generate(), media_type="text/event-stream")


@router.get("/ai-briefing", response_model=AIBriefingResponse)
@limiter.limit(settings.ai_rate_limit)
async def ai_briefing(
    request: Request,
    db: Session = Depends(get_db),
) -> AIBriefingResponse:
    """Returns a full structured executive briefing generated by Claude (cached 24 h)."""
    context, _ = _build_context(db, None)
    try:
        briefing_raw, cached = get_executive_briefing(db, context)
    except Exception as e:
        print(f"AI Briefing API Error: {e}")
        from ..services.ai_explain import _BRIEFING_FALLBACK
        briefing_raw, cached = _BRIEFING_FALLBACK, False

    sections = [BriefingSection(**s) for s in briefing_raw.get("sections", [])]
    return AIBriefingResponse(sections=sections, cached=cached)


@router.get("/ai-insights", response_model=AIInsightsResponse)
@limiter.limit(settings.ai_rate_limit)
async def ai_insights(
    request: Request,
    topic: str = "overview",
    db: Session = Depends(get_db),
) -> AIInsightsResponse:
    """Returns 3 proactive AI insight bullets for the given topic."""
    valid_topics = {"overview", "inequality", "specialties", "trends"}
    if topic not in valid_topics:
        raise HTTPException(status_code=422, detail=f"topic must be one of {valid_topics}")

    context, _ = _build_context(db, None)
    try:
        bullets_raw, cached = get_proactive_insights(db, topic, context)
    except Exception as e:
        print(f"AI Insights API Error: {e}")
        from ..services.ai_explain import _FALLBACK_INSIGHTS
        bullets_raw, cached = _FALLBACK_INSIGHTS.get(topic, _FALLBACK_INSIGHTS["overview"]), False

    bullets = [AIInsightBullet(**b) for b in bullets_raw]
    return AIInsightsResponse(topic=topic, bullets=bullets, cached=cached)


@router.post("/agent-explain")
@limiter.limit(settings.ai_rate_limit)
async def agent_explain(
    request: Request,
    payload: AIRequest,
) -> dict:
    """Autonomously traverses the SQL database to answer ad-hoc data questions."""
    
    # Phase 19: Privacy Governance
    safe_question = privacy_vault.scrub_text(payload.question)
    
    if not safe_question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    
    try:
        response_text = get_sql_agent_response(safe_question)
    except Exception as e:
        print(f"Agent Explain API Error: {e}")
        response_text = "The autonomous SQL agent is currently unavailable or rate limited. Please use the standard AI explain feature for now."
        
    return {
        "question": safe_question,
        "response": response_text,
        "agentic": True
    }
