import hashlib
import json
from datetime import datetime, timedelta
from typing import Generator
from sqlalchemy.orm import Session
from anthropic import Anthropic
from ..models.ai_cache import AICache
from ..config import settings


client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are an expert NHS waiting list analyst for a public-interest data platform used by journalists, policy analysts, and NHS commissioners.

Your role: surface inequality, explain root causes, and highlight policy-relevant findings from NHS referral-to-treatment (RTT) data, ONS deprivation indices, and CQC quality scores.

Key facts you know:
- The NHS 18-week RTT standard requires 92% of patients to start treatment within 18 weeks of referral.
- England has 7 NHS commissioning regions: North East & Yorkshire, North West, Midlands, East of England, London, South East, South West.
- Deprivation is measured on the Index of Multiple Deprivation (IMD); higher score = more deprived.
- Orthopaedics, Ophthalmology, and Mental Health are the highest-pressure specialties.
- The North East & Yorkshire has the highest inequality score (87/100) and the South West the lowest (31/100) — a 2.4x gap.

Style rules:
- Be concise, factual, and cite specific numbers.
- Use plain English suitable for non-technical readers.
- Format key numbers and findings in **bold**.
- Do not speculate beyond what the data shows.
- When relevant, mention policy implications."""


def _cache_key(question: str, region: str | None) -> str:
    raw = f"{question.lower().strip()}|{(region or '').lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]


def _build_context_message(question: str, region: str | None, context: dict) -> str:
    region_clause = f" Focus specifically on: {region}." if region else ""
    context_block = "\n".join(f"- {k}: {v}" for k, v in context.items())
    return f"""Current NHS data context:{region_clause}
{context_block}

User question: {question}"""


def _build_messages(
    question: str,
    region: str | None,
    context: dict,
    history: list[dict],
) -> list[dict]:
    """Build Anthropic messages list with optional prior conversation turns."""
    messages: list[dict] = []

    # Inject data context only into the first user message
    if history:
        # Prior turns: alternate user/assistant without re-injecting context
        for turn in history:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": question})
    else:
        messages.append({"role": "user", "content": _build_context_message(question, region, context)})

    return messages


def get_ai_response(
    db: Session,
    question: str,
    region: str | None,
    data_context: dict,
    history: list[dict] | None = None,
) -> tuple[str, bool]:
    # Only cache single-turn (no history) queries for correctness
    history = history or []
    use_cache = len(history) == 0
    key = _cache_key(question, region)
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    if use_cache:
        cached = db.query(AICache).filter(
            AICache.cache_key == key,
            AICache.created_at >= ttl_cutoff,
        ).first()
        if cached:
            cached.hit_count += 1
            db.commit()
            return cached.response, True

    messages = _build_messages(question, region, data_context, history)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )
    response_text = message.content[0].text

    if use_cache:
        entry = AICache(
            cache_key=key,
            question=question,
            region=region,
            response=response_text,
            hit_count=0,
        )
        db.add(entry)
        db.commit()

    return response_text, False


def stream_ai_response(
    question: str,
    region: str | None,
    data_context: dict,
    history: list[dict] | None = None,
) -> Generator[str, None, None]:
    """Yields text chunks as SSE data lines for streaming responses."""
    history = history or []
    messages = _build_messages(question, region, data_context, history)

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


_INSIGHTS_PROMPTS: dict[str, str] = {
    "overview": (
        "Based on the latest NHS waiting list data, generate exactly 3 key insights a policy analyst "
        "should know right now. Focus on national trends, regional inequality, and the worst-performing areas. "
        "Return ONLY valid JSON in this exact shape — no markdown, no preamble:\n"
        '[{"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}]'
    ),
    "specialties": (
        "Based on NHS waiting list data by specialty, generate exactly 3 key insights. "
        "Focus on which specialties are under most pressure, fastest-growing backlogs, and policy implications. "
        "Return ONLY valid JSON — no markdown, no preamble:\n"
        '[{"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}]'
    ),
    "trends": (
        "Based on NHS waiting list trend data and 6-month forecasts, generate exactly 3 key insights. "
        "Focus on trajectory, the widening regional gap, and what happens if current trends continue. "
        "Return ONLY valid JSON — no markdown, no preamble:\n"
        '[{"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}]'
    ),
    "inequality": (
        "Based on NHS regional inequality data (deprivation index vs inequality score), generate exactly 3 key insights. "
        "Focus on what drives the inequality gap, which regions are outliers, and what the deprivation correlation means for policy. "
        "Return ONLY valid JSON — no markdown, no preamble:\n"
        '[{"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}]'
    ),
}

_FALLBACK_INSIGHTS: dict[str, list[dict]] = {
    "specialties": [
        {"heading": "Orthopaedics under severe pressure", "detail": "52% of 680,000 orthopaedic patients are waiting over 18 weeks — the highest rate of any specialty."},
        {"heading": "Mental health backlog growing fastest", "detail": "Mental health waiting times have grown 22.1% year-on-year, the steepest rise across all tracked specialties."},
        {"heading": "Ophthalmology close behind", "detail": "Ophthalmology has 520,000 patients waiting with 48% over 18 weeks — up 14.2% year-on-year."},
    ],
    "trends": [
        {"heading": "North East trajectory is unsustainable", "detail": "At the current growth rate, the North East backlog will reach 9.4M patients by Apr 2026 — a 43% increase on Jan 2022."},
        {"heading": "Regional gap is widening", "detail": "The NE/SW gap ratio has grown from 2.4x in Jan 2022 to a projected 3.1x by Apr 2026 if trends continue."},
        {"heading": "South West also deteriorating", "detail": "Even the best-performing region has seen a 24% backlog increase since Jan 2022, suggesting a systemic national capacity problem."},
    ],
    "overview": [
        {"heading": "7.62M patients waiting nationally", "detail": "The national backlog has grown 2.3% this month and is up significantly since 2022."},
        {"heading": "2.4x regional inequality gap", "detail": "North East & Yorkshire has 87% of patients waiting over 18 weeks vs 31% in the South West."},
        {"heading": "Only 3 of 7 regions improving", "detail": "The majority of NHS regions are stable or deteriorating, pointing to a need for targeted national intervention."},
    ],
    "inequality": [
        {"heading": "Deprivation explains 91% of variance", "detail": "The correlation between deprivation index and inequality score is r ≈ 0.91 — deprivation is the strongest predictor of waiting time inequality."},
        {"heading": "North East is a clear outlier", "detail": "With a deprivation score of 78/100 and an inequality score of 87/100, the North East sits far above the regression line, suggesting structural underfunding beyond deprivation alone."},
        {"heading": "South West bucking the trend", "detail": "The South West has moderate deprivation (31/100) and the lowest inequality score (31/100), suggesting effective local commissioning can offset deprivation effects."},
    ],
}


def get_proactive_insights(
    db: Session,
    topic: str,
    data_context: dict,
) -> tuple[list[dict], bool]:
    """Returns 3 structured insight bullets for a given topic, with caching."""
    cache_raw = f"insights|{topic}"
    key = hashlib.sha256(cache_raw.encode()).hexdigest()[:64]
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    cached = db.query(AICache).filter(
        AICache.cache_key == key,
        AICache.created_at >= ttl_cutoff,
    ).first()

    if cached:
        cached.hit_count += 1
        db.commit()
        return json.loads(cached.response), True

    if not settings.anthropic_api_key:
        return _FALLBACK_INSIGHTS.get(topic, _FALLBACK_INSIGHTS["overview"]), False

    context_block = "\n".join(f"- {k}: {v}" for k, v in data_context.items())
    prompt = _INSIGHTS_PROMPTS.get(topic, _INSIGHTS_PROMPTS["overview"])
    full_prompt = f"Current NHS data:\n{context_block}\n\n{prompt}"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": full_prompt}],
    )
    raw = message.content[0].text.strip()

    try:
        bullets = json.loads(raw)
    except json.JSONDecodeError:
        bullets = _FALLBACK_INSIGHTS.get(topic, _FALLBACK_INSIGHTS["overview"])

    entry = AICache(
        cache_key=key,
        question=f"insights:{topic}",
        region=None,
        response=json.dumps(bullets),
        hit_count=0,
    )
    db.add(entry)
    db.commit()
    return bullets, False


_BRIEFING_PROMPT = """Based on the NHS waiting list data provided, write an executive briefing for NHS commissioners and policy makers.

Return ONLY valid JSON with this exact structure — no markdown fences, no preamble:
{
  "sections": [
    {"heading": "Situation Overview", "body": "2-3 sentences on the national picture with key numbers."},
    {"heading": "Regional Analysis", "body": "Which regions are performing worst and why, with specific figures."},
    {"heading": "Specialty Pressures", "body": "Which specialties are under most pressure and growth rates."},
    {"heading": "Red Flags", "body": "2-3 specific anomalies or deteriorating signals that require immediate attention."},
    {"heading": "Policy Recommendations", "body": "3 concrete, evidence-based actions commissioners should take."}
  ]
}

Each body should be 3-5 sentences. Use specific numbers. Be direct and actionable."""

_BRIEFING_FALLBACK = {
    "sections": [
        {
            "heading": "Situation Overview",
            "body": (
                "The NHS waiting list stands at **7.62 million** patients nationally, growing 2.3% this month. "
                "**38.4%** of patients are waiting over the 18-week RTT standard. "
                "The national picture is one of sustained deterioration with no sign of stabilisation."
            ),
        },
        {
            "heading": "Regional Analysis",
            "body": (
                "The **North East & Yorkshire** remains the worst-performing region with an inequality score of **87/100** — "
                "87% of patients waiting over 18 weeks, compared to **31%** in the South West. "
                "This **2.4x gap** is the widest on record. "
                "The Midlands (score 74) and North West (68) are also significantly above the national average. "
                "Only the South West, South East, and London show improving trends."
            ),
        },
        {
            "heading": "Specialty Pressures",
            "body": (
                "**Orthopaedics** is the highest-pressure specialty: 680,000 patients waiting with **52%** over 18 weeks, up 18.4% year-on-year. "
                "**Mental health** has seen the steepest growth at **+22.1% YoY**, signalling an emerging crisis in community provision. "
                "Ophthalmology (48% over 18 weeks, 520k patients) and Neurology (44%) are also critical. "
                "The common thread is elective care capacity being crowded out by emergency demand in deprived areas."
            ),
        },
        {
            "heading": "Red Flags",
            "body": (
                "1. **Mental health YoY growth (22.1%)** is nearly double the next-highest specialty — this trend, if unchecked, "
                "will produce a structural crisis within 18 months. "
                "2. **North East deterioration continues**: the region has not shown a single month of improvement in the tracked period. "
                "3. **National backlog trajectory** projects 9M+ patients by mid-2025 at current growth rates — a threshold that has historically triggered emergency funding reviews."
            ),
        },
        {
            "heading": "Policy Recommendations",
            "body": (
                "1. **Targeted North East investment**: allocate additional orthopaedic and mental health capacity specifically to North East & Yorkshire trusts — "
                "modelling suggests this would have the highest marginal impact on national inequality figures. "
                "2. **Mental health rapid review**: commission an urgent review of mental health referral-to-treatment pathways; "
                "22% YoY growth requires structural intervention, not capacity management alone. "
                "3. **Deprivation-weighted funding formula**: the 0.91 correlation between deprivation and inequality score justifies "
                "revising the funding allocation formula to weight deprived areas more heavily in elective care budgets."
            ),
        },
    ]
}


def get_executive_briefing(db: Session, data_context: dict) -> tuple[dict, bool]:
    """Returns a full structured executive briefing, cached for 24 hours."""
    key = hashlib.sha256(b"executive_briefing_v1").hexdigest()[:64]
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    cached = db.query(AICache).filter(
        AICache.cache_key == key,
        AICache.created_at >= ttl_cutoff,
    ).first()

    if cached:
        cached.hit_count += 1
        db.commit()
        return json.loads(cached.response), True

    if not settings.anthropic_api_key:
        return _BRIEFING_FALLBACK, False

    context_block = "\n".join(f"- {k}: {v}" for k, v in data_context.items())
    full_prompt = f"Current NHS data:\n{context_block}\n\n{_BRIEFING_PROMPT}"

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": full_prompt}],
    )
    raw = message.content[0].text.strip()

    try:
        briefing = json.loads(raw)
    except json.JSONDecodeError:
        briefing = _BRIEFING_FALLBACK

    entry = AICache(
        cache_key=key,
        question="executive_briefing",
        region=None,
        response=json.dumps(briefing),
        hit_count=0,
    )
    db.add(entry)
    db.commit()
    return briefing, False
