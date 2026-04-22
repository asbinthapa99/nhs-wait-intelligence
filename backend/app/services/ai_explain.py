"""
AI explain service — cascade: Gemini Flash → Groq (llama3) → OpenAI GPT-4o-mini → local fallback.
Each provider is tried in order; on rate-limit / error the next is used.
"""
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Generator

import httpx
from sqlalchemy.orm import Session

from ..models.ai_cache import AICache
from ..config import settings

log = logging.getLogger(__name__)

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


# ── Provider implementations ──────────────────────────────────────────────────

def _gemini(prompt: str, max_tokens: int) -> str:
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key}",
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4},
        },
        timeout=30,
    )
    resp.raise_for_status()
    candidate = resp.json()["candidates"][0]
    parts = candidate.get("content", {}).get("parts", [])
    return parts[0]["text"] if parts else ""


def _groq(prompt: str, max_tokens: int) -> str:
    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.4,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _freellm(prompt: str, max_tokens: int) -> str:
    resp = httpx.post(
        "https://apifreellm.com/api/v1/chat",
        headers={"Authorization": f"Bearer {settings.freellm_api_key}"},
        json={
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.4,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    # handle both OpenAI-style and direct response formats
    if "choices" in data:
        return data["choices"][0]["message"]["content"]
    return data.get("content") or data.get("text") or data.get("response", "")


def _openrouter(prompt: str, max_tokens: int) -> str:
    resp = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "HTTP-Referer": "https://nhs-wait-intelligence.vercel.app",
            "X-Title": "NHS Wait Intelligence",
        },
        json={
            "model": "google/gemma-4-31b-it:free",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.4,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _openai(prompt: str, max_tokens: int) -> str:
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.4,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _generate(prompt: str, max_tokens: int = 600) -> str:
    """Try each provider in order — Gemini → Groq → OpenRouter → OpenAI → raise."""
    providers = []
    if settings.gemini_api_key:
        providers.append(("Gemini", _gemini))
    if settings.groq_api_key:
        providers.append(("Groq", _groq))
    if settings.openrouter_api_key:
        providers.append(("OpenRouter", _openrouter))
    if settings.freellm_api_key:
        providers.append(("FreeLLM", _freellm))
    if settings.openai_api_key:
        providers.append(("OpenAI", _openai))

    last_err: Exception = RuntimeError("No AI provider configured")
    for name, fn in providers:
        try:
            result = fn(prompt, max_tokens)
            if name != "Gemini":
                log.info("AI fallback used: %s", name)
            return result
        except Exception as e:
            log.warning("AI provider %s failed: %s", name, e)
            last_err = e

    raise last_err


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cache_key(question: str, region: str | None) -> str:
    raw = f"{question.lower().strip()}|{(region or '').lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]


def _build_prompt(question: str, region: str | None, context: dict, history: list[dict]) -> str:
    region_clause = f" Focus specifically on: {region}." if region else ""
    context_block = "\n".join(f"- {k}: {v}" for k, v in context.items())
    header = f"Current NHS data context:{region_clause}\n{context_block}\n\n"
    if history:
        turns = "\n".join(f"{t['role'].upper()}: {t['content']}" for t in history)
        return f"{header}Conversation so far:\n{turns}\n\nUSER: {question}"
    return f"{header}User question: {question}"


# ── Public API ────────────────────────────────────────────────────────────────

def get_ai_response(
    db: Session,
    question: str,
    region: str | None,
    data_context: dict,
    history: list[dict] | None = None,
) -> tuple[str, bool]:
    history = history or []
    use_cache = len(history) == 0
    key = _cache_key(question, region)
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    if use_cache:
        cached = db.query(AICache).filter(
            AICache.cache_key == key, AICache.created_at >= ttl_cutoff,
        ).first()
        if cached:
            cached.hit_count += 1
            db.commit()
            return cached.response, True

    prompt = _build_prompt(question, region, data_context, history)
    response_text = _generate(prompt, max_tokens=600)

    if use_cache:
        db.add(AICache(cache_key=key, question=question, region=region, response=response_text, hit_count=0))
        db.commit()

    return response_text, False


def stream_ai_response(
    question: str,
    region: str | None,
    data_context: dict,
    history: list[dict] | None = None,
) -> Generator[str, None, None]:
    """Stream via Groq (fastest) → fallback to non-streaming Gemini/OpenAI."""
    history = history or []
    prompt = _build_prompt(question, region, data_context, history)

    # Try Groq streaming first (lowest latency)
    if settings.groq_api_key:
        try:
            with httpx.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 600,
                    "temperature": 0.4,
                    "stream": True,
                },
                timeout=60,
            ) as resp:
                for line in resp.iter_lines():
                    if not line.startswith("data: ") or line == "data: [DONE]":
                        continue
                    try:
                        chunk = json.loads(line[6:])
                        text = chunk["choices"][0]["delta"].get("content", "")
                        if text:
                            yield text
                    except (KeyError, json.JSONDecodeError):
                        continue
            return
        except Exception as e:
            log.warning("Groq stream failed, falling back: %s", e)

    # Gemini streaming fallback
    if settings.gemini_api_key:
        try:
            with httpx.stream(
                "POST",
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key={settings.gemini_api_key}&alt=sse",
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                    "generationConfig": {"maxOutputTokens": 600, "temperature": 0.4},
                },
                timeout=60,
            ) as resp:
                for line in resp.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        chunk = json.loads(line[6:])
                        text = chunk["candidates"][0]["content"]["parts"][0]["text"]
                        if text:
                            yield text
                    except (KeyError, json.JSONDecodeError):
                        continue
            return
        except Exception as e:
            log.warning("Gemini stream failed, falling back: %s", e)

    # Last resort: non-streaming OpenAI
    try:
        yield _generate(prompt, max_tokens=600)
    except Exception:
        yield "AI service is temporarily unavailable. Please try again in a moment."


# ── Insights & briefing (same cascade, identical structure) ───────────────────

_INSIGHTS_PROMPTS: dict[str, str] = {
    "overview": (
        "Based on the latest NHS waiting list data, generate exactly 3 key insights a policy analyst "
        "should know right now. Focus on national trends, regional inequality, and the worst-performing areas. "
        "Return ONLY valid JSON — no markdown, no preamble:\n"
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
        "Return ONLY valid JSON — no markdown, no preamble:\n"
        '[{"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}, {"heading": "...", "detail": "..."}]'
    ),
    "inequality": (
        "Based on NHS regional inequality data, generate exactly 3 key insights. "
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
        {"heading": "North East is a clear outlier", "detail": "With a deprivation score of 78/100 and an inequality score of 87/100, the North East sits far above the regression line."},
        {"heading": "South West bucking the trend", "detail": "The South West has moderate deprivation (31/100) and the lowest inequality score (31/100), suggesting effective local commissioning."},
    ],
}

_BRIEFING_PROMPT = """Based on the NHS waiting list data provided, write an executive briefing for NHS commissioners.
Return ONLY valid JSON — no markdown fences, no preamble:
{"sections":[{"heading":"Situation Overview","body":"..."},{"heading":"Regional Analysis","body":"..."},{"heading":"Specialty Pressures","body":"..."},{"heading":"Red Flags","body":"..."},{"heading":"Policy Recommendations","body":"..."}]}
Each body 3-5 sentences. Use specific numbers. Be direct."""

_BRIEFING_FALLBACK = {"sections": [
    {"heading": "Situation Overview", "body": "The NHS waiting list stands at **7.62 million** patients nationally, growing 2.3% this month. **38.4%** of patients are waiting over the 18-week RTT standard."},
    {"heading": "Regional Analysis", "body": "The **North East & Yorkshire** has an inequality score of **87/100** — a **2.4x gap** vs the South West, the widest on record."},
    {"heading": "Specialty Pressures", "body": "**Orthopaedics**: 680,000 patients, 52% over 18 weeks, +18.4% YoY. **Mental health**: +22.1% YoY — the steepest growth."},
    {"heading": "Red Flags", "body": "Mental health growth (22.1%) is double the next specialty. North East has no month of improvement in the tracked period."},
    {"heading": "Policy Recommendations", "body": "1. Targeted North East orthopaedic and mental health investment. 2. Urgent mental health pathway review. 3. Deprivation-weighted funding formula."},
]}


def get_proactive_insights(db: Session, topic: str, data_context: dict) -> tuple[list[dict], bool]:
    key = hashlib.sha256(f"insights|{topic}".encode()).hexdigest()[:64]
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    cached = db.query(AICache).filter(AICache.cache_key == key, AICache.created_at >= ttl_cutoff).first()
    if cached:
        cached.hit_count += 1
        db.commit()
        return json.loads(cached.response), True

    if not any([settings.gemini_api_key, settings.groq_api_key, settings.openai_api_key]):
        return _FALLBACK_INSIGHTS.get(topic, _FALLBACK_INSIGHTS["overview"]), False

    context_block = "\n".join(f"- {k}: {v}" for k, v in data_context.items())
    prompt = f"Current NHS data:\n{context_block}\n\n{_INSIGHTS_PROMPTS.get(topic, _INSIGHTS_PROMPTS['overview'])}"

    try:
        raw = _generate(prompt, max_tokens=500)
        bullets = json.loads(raw.strip())
    except Exception:
        bullets = _FALLBACK_INSIGHTS.get(topic, _FALLBACK_INSIGHTS["overview"])

    db.add(AICache(cache_key=key, question=f"insights:{topic}", region=None, response=json.dumps(bullets), hit_count=0))
    db.commit()
    return bullets, False


def get_executive_briefing(db: Session, data_context: dict) -> tuple[dict, bool]:
    key = hashlib.sha256(b"executive_briefing_v1").hexdigest()[:64]
    ttl_cutoff = datetime.utcnow() - timedelta(hours=settings.cache_ttl_hours)

    cached = db.query(AICache).filter(AICache.cache_key == key, AICache.created_at >= ttl_cutoff).first()
    if cached:
        cached.hit_count += 1
        db.commit()
        return json.loads(cached.response), True

    if not any([settings.gemini_api_key, settings.groq_api_key, settings.openai_api_key]):
        return _BRIEFING_FALLBACK, False

    context_block = "\n".join(f"- {k}: {v}" for k, v in data_context.items())
    prompt = f"Current NHS data:\n{context_block}\n\n{_BRIEFING_PROMPT}"

    try:
        raw = _generate(prompt, max_tokens=1200)
        briefing = json.loads(raw.strip())
    except Exception:
        briefing = _BRIEFING_FALLBACK

    db.add(AICache(cache_key=key, question="executive_briefing", region=None, response=json.dumps(briefing), hit_count=0))
    db.commit()
    return briefing, False
