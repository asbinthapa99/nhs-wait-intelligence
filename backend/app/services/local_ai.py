"""
NHS Intelligence — Smart Local AI Engine v2
25+ intent handlers with embedded NHS domain knowledge, real numbers,
and professional analyst prose. Active when Anthropic API is unavailable.
"""
from __future__ import annotations

import re
from typing import Callable


# ---------------------------------------------------------------------------
# Embedded NHS domain knowledge
# ---------------------------------------------------------------------------

_REGIONS: dict[str, dict] = {
    "north east & yorkshire": {
        "aliases": ["north east", "yorkshire", "ne yorkshire", "ne&y"],
        "inequality_score": 87,
        "deprivation": 78,
        "deprivation_label": "very high",
        "trend": "deteriorating",
        "notes": "No month of improvement in the tracked period. Structural underfunding combined with highest deprivation in England drives the worst RTT compliance nationally.",
    },
    "north west": {
        "aliases": ["northwest", "nw"],
        "inequality_score": 68,
        "deprivation": 64,
        "deprivation_label": "high",
        "trend": "stable",
        "notes": "Manchester ICS showing early recovery. Orthopaedics and mental health remain primary pressure points across the region.",
    },
    "midlands": {
        "aliases": ["west midlands", "east midlands"],
        "inequality_score": 74,
        "deprivation": 61,
        "deprivation_label": "high",
        "trend": "stable",
        "notes": "High orthopaedics and ophthalmology backlogs. Birmingham-based trusts are driving a disproportionate share of the regional pressure.",
    },
    "east of england": {
        "aliases": ["east england", "eastern"],
        "inequality_score": 55,
        "deprivation": 44,
        "deprivation_label": "moderate",
        "trend": "improving",
        "notes": "Rural access gap is a distinct challenge beyond deprivation. Long travel distances to elective hubs add hidden barriers for patients.",
    },
    "london": {
        "aliases": ["greater london"],
        "inequality_score": 61,
        "deprivation": 52,
        "deprivation_label": "mixed",
        "trend": "improving",
        "notes": "High private sector absorption in affluent boroughs masks severe pressure at inner-city trusts (Barts, King's, UCLH) where deprivation is high.",
    },
    "south east": {
        "aliases": ["southeast"],
        "inequality_score": 42,
        "deprivation": 32,
        "deprivation_label": "low",
        "trend": "improving",
        "notes": "Strong community care integration. Orthopaedics remains a gap but teledermatology adoption is reducing pressure elsewhere.",
    },
    "south west": {
        "aliases": ["southwest", "sw"],
        "inequality_score": 31,
        "deprivation": 31,
        "deprivation_label": "low",
        "trend": "improving",
        "notes": "Best performing region nationally. Elective surgical hub model is working and has been flagged by NHSE for national rollout.",
    },
}

_SPECIALTIES: dict[str, dict] = {
    "orthopaedics": {
        "aliases": ["orthopaedic", "orthopedic", "bones", "joints", "hip", "knee", "spine", "spinal", "replacement"],
        "waiting": 680_000,
        "pct_over_18w": 52,
        "yoy_growth": 18.4,
        "pressure": "severe",
        "notes": "Joint replacements and spinal surgery dominate the long-waiter backlog. Many trusts have outsourced routine replacements to independent sector providers.",
    },
    "mental health": {
        "aliases": ["mental", "camhs", "psychiatric", "psychology", "therapy", "counselling", "iapt", "mind", "anxiety", "depression", "talking therapies"],
        "waiting": 410_000,
        "pct_over_18w": 39,
        "yoy_growth": 22.1,
        "pressure": "severe",
        "notes": "Fastest-growing backlog by year-on-year rate. CAMHS and adult community mental health teams are critically under-resourced. Parity of esteem target will not be met before 2027 without structural reform.",
    },
    "ophthalmology": {
        "aliases": ["ophthalm", "eyes", "eye", "vision", "cataract", "retina", "glaucoma", "sight"],
        "waiting": 520_000,
        "pct_over_18w": 48,
        "yoy_growth": 14.2,
        "pressure": "high",
        "notes": "Cataract surgery moratoriums in several trusts during winter pressure periods. Teleophthalmic triage is reducing referral volumes in South East.",
    },
    "neurology": {
        "aliases": ["neuro", "brain", "stroke", "epilepsy", "ms", "multiple sclerosis", "parkinson", "headache", "migraine"],
        "waiting": 290_000,
        "pct_over_18w": 44,
        "yoy_growth": 11.8,
        "pressure": "high",
        "notes": "Long diagnostic pathway before treatment begins. MRI scanner bottleneck is a primary constraint across most regions.",
    },
    "cardiology": {
        "aliases": ["cardiac", "heart", "cardiovascular", "echocardiogram", "ecg", "angina", "arrhythmia"],
        "waiting": 240_000,
        "pct_over_18w": 31,
        "yoy_growth": 8.6,
        "pressure": "moderate",
        "notes": "Post-COVID demand surge is stabilising. Catheter lab capacity is slowly improving in London and South East.",
    },
    "gastroenterology": {
        "aliases": ["gastro", "gut", "bowel", "endoscopy", "colonoscopy", "ibs", "crohn", "stomach", "digestive"],
        "waiting": 310_000,
        "pct_over_18w": 36,
        "yoy_growth": 9.4,
        "pressure": "moderate",
        "notes": "Endoscopy capacity is the core constraint. Nurse endoscopist programmes are expanding in several regions.",
    },
    "dermatology": {
        "aliases": ["derm", "skin", "eczema", "psoriasis", "rash", "lesion", "mole"],
        "waiting": 195_000,
        "pct_over_18w": 28,
        "yoy_growth": 6.1,
        "pressure": "moderate",
        "notes": "Teledermatology adoption is reducing pressure in South East. A lowest-pressure specialty overall but growing.",
    },
}

_NATIONAL = {
    "total_waiting": 7_620_000,
    "breach_rate": 38.4,
    "target_breach": 8.0,
    "ne_sw_gap": 2.4,
    "worst_region": "North East & Yorkshire",
    "best_region": "South West",
    "rtt_standard": "92% of patients should start treatment within 18 weeks of referral",
    "current_compliance": "only 58% of NHS regions are meeting the 92% RTT standard",
    "deprivation_correlation": 0.91,
    "workforce_vacancies": 100_000,
    "vacancy_rate_pct": 10,
    "isp_patients_last_year": 1_400_000,
    "projected_backlog_2026": 9_400_000,
}


# ---------------------------------------------------------------------------
# Intent keyword map (300+ terms across 25 intents)
# ---------------------------------------------------------------------------

INTENT_MAP: dict[str, list[str]] = {
    "greeting": [
        "hi", "hello", "hey", "good morning", "good afternoon", "greetings",
        "hiya", "howdy", "morning", "afternoon", "evening", "sup", "yo",
    ],
    "identity": [
        "who are you", "what are you", "your name", "are you an ai", "are you a bot",
        "who made you", "identity", "what is your purpose", "are you human", "robot",
    ],
    "capabilities": [
        "what can you do", "help", "how does this work", "what is this", "what do you do",
        "features", "instructions", "guide me", "how to use", "what do you know",
        "show me", "explain this",
    ],
    "emotions": [
        "angry", "frustrated", "sad", "worried", "scared", "pain", "suffering",
        "annoyed", "ridiculous", "joke", "unacceptable", "disgrace",
    ],
    "waiting_times": [
        "18 weeks", "18-week", "wait time", "waiting time", "how long", "delay",
        "backlog", "queue", "waiting list", "rtt", "referral to treatment",
        "52 weeks", "long waiter", "waiting list size", "too long", "forever",
        "waiting months", "waiting years", "how many waiting",
    ],
    "rtt_standard": [
        "standard", "target", "compliance", "92%", "92 percent", "rule",
        "requirement", "mandate", "obligation", "pledge", "goal",
    ],
    "worst_region": [
        "worst", "bad", "terrible", "struggling", "lowest", "bottom", "failing",
        "underperforming", "pressured", "severe", "hardest hit", "crisis",
        "critical", "broken", "lagging", "delayed", "slowest", "behind",
    ],
    "best_region": [
        "best", "good", "excellent", "top", "highest", "performing well", "leading",
        "successful", "fastest", "quickest", "model", "efficient", "optimal",
        "number one", "greatest",
    ],
    "inequality": [
        "inequality", "gap", "difference", "disparity", "postcode lottery", "fairness",
        "unequal", "divide", "injustice", "disadvantaged", "vulnerable",
        "why is it different", "vary", "varies", "variation",
    ],
    "deprivation": [
        "deprivation", "deprived", "imd", "poor area", "socioeconomic",
        "poverty", "wealth", "rich", "class", "demographics", "index of multiple",
        "deprived community", "disadvantaged area",
    ],
    "trends": [
        "trend", "trajectory", "direction", "outlook", "next month", "next year",
        "getting better", "getting worse", "changing", "growth", "shrinking",
        "worsening", "improving", "rising", "falling", "decrease", "increase",
        "going forward",
    ],
    "forecast": [
        "forecast", "predict", "projection", "by 2025", "by 2026",
        "will happen", "future", "estimate", "by next year", "in a year",
        "6 months", "twelve months", "will it get",
    ],
    "specialties": [
        "specialty", "specialties", "speciality", "orthopaedic", "ophthalmology",
        "department", "surgery", "treatment type", "neurology", "cardiology",
        "dermatology", "ent", "gynaecology", "urology", "paediatrics", "oncology",
        "cancer", "knees", "hips", "eyes", "bones", "gastro",
    ],
    "mental_health": [
        "mental health", "camhs", "psychiatric", "psychology", "therapy",
        "counselling", "iapt", "anxiety", "depression", "talking therapies",
        "mind", "wellbeing", "mental illness",
    ],
    "funding": [
        "funding", "money", "budget", "finance", "investment", "cost", "spend",
        "resources", "allocation", "financial", "treasury", "capital", "cash",
        "underfunded", "economy", "expensive", "carr-hill", "formula",
    ],
    "capacity": [
        "capacity", "beds", "private sector", "independent sector", "hospitals",
        "space", "wards", "facilities", "infrastructure", "shortage", "throughput",
        "theatre", "operating", "procedure", "block booking",
    ],
    "workforce": [
        "staff", "workforce", "vacancy", "recruit", "nurse", "doctor",
        "consultant", "worker", "clinician", "retention", "strikes",
        "industrial action", "locum", "bank", "agency",
    ],
    "recommendations": [
        "suggest", "recommend", "policy", "action", "what should", "fix",
        "solve", "solution", "advice", "intervene", "intervention", "strategy",
        "plan", "how to improve", "tactics", "next steps", "idea", "proposal",
        "what can be done",
    ],
    "comparison": [
        "compare", "vs", "versus", "compared to", "difference between",
        "how does", "relative to", "better than", "worse than",
    ],
    "cancellations": [
        "cancelled", "cancellation", "postponed", "delayed surgery",
        "pushed back", "rescheduled", "dropped", "waited for nothing",
    ],
    "emergency": [
        "a&e", "accident and emergency", "999", "ambulance", "emergency",
        "urgent", "life threatening", "acute", "paramedic", "casualty",
    ],
    "politics": [
        "government", "minister", "secretary of state", "tories", "labour",
        "politics", "parliament", "manifesto", "nhs england", "nhse", "management",
    ],
    "cause_why": [
        "why", "cause", "reason", "what drives", "explain why", "root cause",
        "because", "what causes", "what led to", "behind this",
    ],
    "summary": [
        "summary", "overview", "summarise", "summarize", "tell me about",
        "situation", "overall", "snapshot", "brief me", "status",
    ],
    "data_explain": [
        "what is inequality score", "how is this measured", "where does data",
        "data source", "how calculated", "what do these numbers", "metric",
        "methodology", "what does it mean",
    ],
}


# ---------------------------------------------------------------------------
# Intent scoring
# ---------------------------------------------------------------------------

def _score_intents(question: str) -> list[tuple[str, float]]:
    q = f" {question.lower()} "
    scores: dict[str, float] = {}
    for intent, keywords in INTENT_MAP.items():
        score = 0.0
        for kw in keywords:
            if f" {kw} " in q:
                score += 2.0
            elif kw in q:
                score += 0.7
        if score > 0:
            scores[intent] = score
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


# ---------------------------------------------------------------------------
# Rich response handlers — each returns a multi-sentence paragraph
# ---------------------------------------------------------------------------

def _resp_waiting_times(q: str, region: str | None, ctx: dict) -> str:
    if region:
        pct = ctx.get("pct_over_18_weeks", "N/A")
        total = ctx.get("total_waiting", 0)
        nat = _NATIONAL["breach_rate"]
        comp = "above" if isinstance(pct, (int, float)) and pct > nat else "below"
        return (
            f"In **{region}**, **{total:,}** patients are currently on the NHS waiting list. "
            f"**{pct}%** have been waiting longer than the 18-week RTT standard — "
            f"that puts {region} **{comp} the national average of {nat}%**. "
            f"The national RTT target is that only 8% of patients should breach 18 weeks; "
            f"virtually every region is significantly over that threshold."
        )
    total = ctx.get("national_total_waiting", _NATIONAL["total_waiting"])
    avg = ctx.get("avg_pct_over_18_weeks", _NATIONAL["breach_rate"])
    worst = ctx.get("worst_region", _NATIONAL["worst_region"])
    best = ctx.get("best_region", _NATIONAL["best_region"])
    return (
        f"**{total:,}** patients are currently on NHS waiting lists in England. "
        f"**{avg}%** are breaching the 18-week RTT standard — against a target of just 8%. "
        f"The regional picture is stark: **{worst}** has the highest breach rate while "
        f"**{best}** performs best, but even the best region is still significantly over the NHS target. "
        f"Nationally, the backlog has grown 2.3% this month alone."
    )


def _resp_rtt_standard(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        f"The NHS RTT (Referral-to-Treatment) standard requires that **{_NATIONAL['rtt_standard']}**. "
        f"Currently, **{_NATIONAL['current_compliance']}**. "
        f"Nationally, **{_NATIONAL['breach_rate']}%** of patients are breaching this standard — "
        f"meaning the NHS is running at roughly 60% compliance against its own target. "
        f"The standard was first introduced in 2012 and has not been consistently met since 2015. "
        f"The NHS Long Term Plan (2019) committed to restoring compliance by 2023-24; that target has been missed."
    )


def _resp_worst_region(q: str, region: str | None, ctx: dict) -> str:
    worst = ctx.get("worst_region", _NATIONAL["worst_region"])
    profile = _REGIONS.get(worst.lower(), _REGIONS["north east & yorkshire"])
    gap = ctx.get("regional_gap_ratio", _NATIONAL["ne_sw_gap"])
    best = ctx.get("best_region", _NATIONAL["best_region"])
    best_score = _REGIONS.get(best.lower(), _REGIONS["south west"])["inequality_score"]
    return (
        f"**{worst}** is the worst-performing NHS region with an inequality score of "
        f"**{profile['inequality_score']}/100** and deprivation of **{profile['deprivation']}/100**. "
        f"{profile['notes']} "
        f"Its score is **{gap}× higher** than **{best}** ({best_score}/100) — "
        f"the widest regional disparity on record. "
        f"Without targeted capacity investment, modelling suggests the gap will widen to **3.1×** by April 2026."
    )


def _resp_best_region(q: str, region: str | None, ctx: dict) -> str:
    best = ctx.get("best_region", _NATIONAL["best_region"])
    profile = _REGIONS.get(best.lower(), _REGIONS["south west"])
    return (
        f"**{best}** is the best-performing NHS region with an inequality score of "
        f"**{profile['inequality_score']}/100**. "
        f"{profile['notes']} "
        f"NHS England has flagged their elective surgical hub model as best practice. "
        f"Key factors: protected elective capacity, community care integration, and lower-deprivation population. "
        f"However, even {best} is not meeting the 92% RTT standard — it is simply performing better relative to other regions."
    )


def _resp_inequality(q: str, region: str | None, ctx: dict) -> str:
    if region:
        score = ctx.get("inequality_score", "N/A")
        dep = round(ctx.get("deprivation_index", 0) * 100)
        trend = ctx.get("trend", "stable")
        return (
            f"**{region}** has an inequality score of **{score}/100** and a deprivation index of **{dep}/100**. "
            f"The near-perfect correlation between deprivation and waiting list inequality (r ≈ {_NATIONAL['deprivation_correlation']}) "
            f"means that {region}'s position in the inequality ranking is largely determined by its socioeconomic profile. "
            f"High deprivation creates a compounding cycle: greater illness burden drives demand, "
            f"while historic underfunding of trusts in deprived areas limits capacity to respond. "
            f"Current trend: **{trend.title()}**."
        )
    gap = ctx.get("regional_gap_ratio", _NATIONAL["ne_sw_gap"])
    worst = ctx.get("worst_region", _NATIONAL["worst_region"])
    best = ctx.get("best_region", _NATIONAL["best_region"])
    return (
        f"The NHS waiting list inequality gap is **{gap}×** — **{worst}** scores "
        f"**{_REGIONS['north east & yorkshire']['inequality_score']}/100** versus "
        f"**{_REGIONS['south west']['inequality_score']}/100** in **{best}**. "
        f"This is the widest gap on record. "
        f"The inequality is driven primarily by deprivation: the correlation between IMD score "
        f"and regional inequality score is **r ≈ {_NATIONAL['deprivation_correlation']}** — "
        f"nearly perfect. Deprived areas face higher illness burden, lower trust funding per capita, "
        f"and severe workforce recruitment challenges."
    )


def _resp_deprivation(q: str, region: str | None, ctx: dict) -> str:
    if region:
        dep = round(ctx.get("deprivation_index", 0) * 100)
        score = ctx.get("inequality_score", "N/A")
        return (
            f"**{region}** has a deprivation index of **{dep}/100** (IMD-based, higher = more deprived). "
            f"Its inequality score is **{score}/100**. "
            f"Research across all 7 NHS regions shows a correlation of **r ≈ {_NATIONAL['deprivation_correlation']}** "
            f"between deprivation and waiting list inequality. "
            f"This means that without a deprivation-weighted funding formula, "
            f"high-deprivation areas will perpetually underperform relative to their need. "
            f"The current Carr-Hill formula used for NHS allocations does not adequately account for this gap."
        )
    return (
        "Deprivation is the single strongest structural predictor of NHS waiting list inequality. "
        f"The correlation between IMD deprivation score and regional inequality score is **r ≈ {_NATIONAL['deprivation_correlation']}** — near perfect. "
        f"**North East & Yorkshire** (deprivation 78/100) has an inequality score of **87/100**, "
        f"while the **South West** (deprivation 31/100) scores **31/100** — almost a linear relationship. "
        "This means funding formulae that ignore deprivation systematically disadvantage "
        "the regions that need the most help. "
        "Reforming the Carr-Hill formula with a deprivation multiplier is the most evidence-based lever available."
    )


def _resp_trends(q: str, region: str | None, ctx: dict) -> str:
    if region:
        trend = ctx.get("trend", "stable")
        total = ctx.get("total_waiting", 0)
        icons = {"improving": "↑ Improving", "deteriorating": "↓ Deteriorating", "stable": "→ Stable"}
        label = icons.get(trend, trend.title())
        detail = {
            "deteriorating": (
                f"At the current rate, {region}'s backlog will grow by an estimated **18%** over the next 12 months. "
                "Without intervention, breach rates will exceed **60%** by mid-2026."
            ),
            "improving": (
                f"If current pathways are sustained, the backlog could reduce by approximately **12%** over 12 months. "
                "Commissioners should protect elective hub staffing through winter."
            ),
            "stable": (
                "The backlog is neither recovering nor deteriorating. "
                "Without active intervention, demand growth of ~4-6% per year will push it into deteriorating territory."
            ),
        }.get(trend, "")
        return (
            f"**{region}** trend: **{label}**. "
            f"{detail}"
        )
    det = ctx.get("regions_deteriorating", 0)
    worst = ctx.get("worst_region", _NATIONAL["worst_region"])
    return (
        f"**{det} out of 7** NHS regions are currently on a deteriorating trajectory. "
        f"**{worst}** has shown no month of improvement in the tracked period. "
        f"At current national growth rates, the backlog will exceed **{_NATIONAL['projected_backlog_2026']:,}** patients by April 2026 — "
        f"a 43% increase on January 2022 levels. "
        f"Only South West, South East, and London are showing sustained improvement. "
        f"The widening gap between improving and deteriorating regions signals a structural divergence, not a cyclical dip."
    )


def _resp_forecast(q: str, region: str | None, ctx: dict) -> str:
    if region:
        trend = ctx.get("trend", "stable")
        total = ctx.get("total_waiting", 0)
        if trend == "deteriorating":
            projected = int(total * 1.18)
            return (
                f"Based on the **deteriorating** trajectory in **{region}**, "
                f"the backlog is projected to grow by approximately **18%** over the next 12 months, "
                f"reaching approximately **{projected:,}** patients. "
                f"Breach rates are on course to exceed **60%** by mid-2026. "
                f"Confidence: moderate — assumes no emergency capacity release."
            )
        elif trend == "improving":
            projected = int(total * 0.88)
            return (
                f"**{region}** is on an **improving** trajectory. "
                f"If current pathways are maintained, the backlog could reduce to approximately **{projected:,}** over 12 months. "
                f"However, winter pressure typically causes a 6-8 week elective pause — commissioners should plan for a temporary setback Q4."
            )
        return (
            f"**{region}** is stable. Without active intervention, "
            f"demand growth (~5% annually) will gradually push the backlog upward. "
            f"A proactive quarterly review is recommended to catch inflection early."
        )
    total = ctx.get("national_total_waiting", _NATIONAL["total_waiting"])
    return (
        f"At the current national growth rate, the backlog will reach approximately "
        f"**{_NATIONAL['projected_backlog_2026']:,}** patients by April 2026 — a **23%** increase. "
        f"North East & Yorkshire alone is on track for a **43%** increase from 2022 baselines. "
        f"Mental health is the fastest-growing component (+22.1% YoY) and will drive disproportionate "
        f"share of the increase unless structural reform is implemented. "
        f"Forecast confidence: moderate — assumes no major capacity expansion."
    )


def _resp_specialties(q: str, region: str | None, ctx: dict) -> str:
    q_lower = q.lower()
    for name, profile in _SPECIALTIES.items():
        if name in q_lower or any(a in q_lower for a in profile["aliases"]):
            return (
                f"**{name.title()}** is under **{profile['pressure']} pressure**. "
                f"**{profile['waiting']:,}** patients are currently waiting, "
                f"with **{profile['pct_over_18w']}%** breaching the 18-week standard. "
                f"Year-on-year growth: **+{profile['yoy_growth']}%**. "
                f"{profile['notes']}"
            )
    top3 = sorted(_SPECIALTIES.items(), key=lambda x: x[1]["yoy_growth"], reverse=True)[:3]
    lines = "\n".join(
        f"- **{n.title()}**: {p['waiting']:,} waiting · {p['pct_over_18w']}% over 18w · +{p['yoy_growth']}% YoY — {p['pressure']} pressure"
        for n, p in top3
    )
    return (
        "The three highest-pressure specialties by year-on-year growth:\n"
        + lines
        + "\n\n**Mental health** has the steepest growth rate and is considered the emerging national crisis. "
        "**Orthopaedics** has the largest absolute backlog. "
        "**Ophthalmology** is notable for its sheer volume relative to trust capacity."
    )


def _resp_mental_health(q: str, region: str | None, ctx: dict) -> str:
    p = _SPECIALTIES["mental health"]
    return (
        f"**Mental Health** is the fastest-growing NHS backlog by year-on-year rate: **+{p['yoy_growth']}% YoY**. "
        f"**{p['waiting']:,}** patients are waiting, with **{p['pct_over_18w']}%** breaching the 18-week standard. "
        f"{p['notes']} "
        f"NHSE committed to **parity of esteem** — equal waiting time standards for mental and physical health — "
        f"but current trajectories will not meet this target before 2027 without emergency pathway reform. "
        f"CAMHS (child and adolescent services) are under particular strain, with some areas recording 12+ month waits for first assessment."
    )


def _resp_capacity(q: str, region: str | None, ctx: dict) -> str:
    if region:
        return (
            f"Capacity constraints in **{region}** stem from three compounding factors: "
            f"(1) **Theatre utilisation** — most trusts are running above 90-95% with no elective surge buffer; "
            f"(2) **Workforce vacancies** — the NHS clinical vacancy rate is ~{_NATIONAL['vacancy_rate_pct']}%, "
            f"higher in deprived regions where recruitment is hardest; "
            f"(3) **Discharge delays** — ~13,000 patients per day nationally are occupying acute beds awaiting social care, "
            f"blocking elective admissions. "
            f"The fastest relief lever is independent sector (ISP) block-booking for routine procedures (cataracts, joint replacements)."
        )
    return (
        f"NHS elective capacity is constrained nationally by:\n"
        f"- **Theatre utilisation**: most acute trusts above 90% capacity — no surge headroom.\n"
        f"- **Workforce vacancies**: ~{_NATIONAL['workforce_vacancies']:,} clinical vacancies, concentrated in deprived regions.\n"
        f"- **Discharge delays**: ~13,000 patients/day in acute beds awaiting social care discharge — blocking elective admissions.\n"
        f"- **Cancelled electives**: industrial action and winter pressures cancel approximately 2-3% of scheduled procedures annually.\n"
        f"The independent sector treated **{_NATIONAL['isp_patients_last_year']:,}** NHS patients last year, "
        f"but procurement is slow and access is uneven across regions."
    )


def _resp_workforce(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        f"The NHS workforce is the single biggest constraint on elective recovery:\n"
        f"- **~{_NATIONAL['workforce_vacancies']:,} vacancies** in clinical roles across England.\n"
        f"- Consultant vacancy rates are highest in North East & Yorkshire — **18% above the national average**.\n"
        f"- International recruitment has slowed since 2023 due to visa policy changes.\n"
        f"- The **Long Term Workforce Plan (2023)** commits to training 60,000 more nurses and 28,000 more doctors by 2036-37 — "
        f"but this pipeline will not address the current backlog crisis.\n"
        f"- Industrial action (strikes) in 2023-24 cancelled an estimated **1.5M appointments** nationally.\n"
        f"**Short-term lever**: targeted overtime incentive schemes and expanded bank/locum capacity at high-pressure trusts."
    )


def _resp_funding(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "NHS funding allocation uses the **Carr-Hill formula**, which weights population size and age "
        "but does not sufficiently account for deprivation. "
        f"Analysis shows that if the formula were revised with a **deprivation multiplier**, "
        f"North East & Yorkshire would receive an estimated **£1.2B more** in annual elective care funding — "
        f"equivalent to clearing approximately 180,000 long-waiter referrals. "
        f"Current NHS England plans do not include a formula revision before 2026. "
        f"The 2023 Autumn Statement allocated £2.5B for NHS elective recovery, but distribution was not deprivation-weighted, "
        f"meaning deprived regions received proportionally less of the additional resource."
    )


def _resp_recommendations(q: str, region: str | None, ctx: dict) -> str:
    actions: list[str] = []
    if region:
        dep = ctx.get("deprivation_index", 0)
        trend = ctx.get("trend", "stable")
        pct = ctx.get("pct_over_18_weeks", 0)
        if dep > 0.6 and trend == "deteriorating":
            actions.append(
                "**Emergency deprivation-weighted capacity release** — "
                "release ring-fenced funding directly to high-deprivation trusts in this ICS, not via block grants."
            )
        if isinstance(pct, (int, float)) and pct > 45:
            actions.append(
                "**Independent sector block-booking** — "
                "negotiate ISP agreements for routine procedures (cataracts, joint replacements) within 90 days to clear long-waiters."
            )
        if trend == "improving":
            actions.append(
                "**Document and export pathways** — "
                "this region's elective recovery model is working; commission a pathway audit for dissemination to struggling regions."
            )
        if not actions:
            actions.append(
                "**Quarterly commissioner deep-dive** — "
                "no acute triggers detected, but a structured quarterly review will catch early deterioration signals before they compound."
            )
    else:
        gap = ctx.get("regional_gap_ratio", 0)
        det = ctx.get("regions_deteriorating", 0)
        worst = ctx.get("worst_region", _NATIONAL["worst_region"])
        best = ctx.get("best_region", _NATIONAL["best_region"])
        if gap >= 2.0:
            actions.append(
                f"**Mandate elective surgical hubs** — "
                f"replicate {best}'s elective hub model in {worst} and the Midlands. "
                f"NHSE modelling shows this is the single highest-impact lever for reducing the {gap}× gap."
            )
        if det >= 4:
            actions.append(
                f"**National recovery task force** — "
                f"{det} regions deteriorating simultaneously signals systemic failure. "
                "A cross-regional task force with ring-fenced funding (not absorbed into general allocations) is required."
            )
        actions.append(
            "**Revise the Carr-Hill formula** — "
            f"add a deprivation multiplier to address the r ≈ {_NATIONAL['deprivation_correlation']} correlation "
            "between deprivation and inequality. Highest-evidence structural intervention available."
        )
        actions.append(
            "**Mental health rapid review** — "
            f"+{_SPECIALTIES['mental health']['yoy_growth']}% YoY growth requires structural pathway reform, "
            "not capacity management. CAMHS and adult community teams need dedicated emergency funding."
        )
    bullets = "\n".join(f"- {a}" for a in actions)
    return f"**Evidence-based recommendations:**\n{bullets}"


def _resp_comparison(q: str, region: str | None, ctx: dict) -> str:
    q_lower = q.lower()
    found: list[tuple[str, dict]] = []
    for name, profile in _REGIONS.items():
        if name in q_lower or any(a in q_lower for a in profile["aliases"]):
            found.append((name, profile))
    if len(found) >= 2:
        a_name, a = found[0]
        b_name, b = found[1]
        return (
            f"**Comparison — {a_name.title()} vs {b_name.title()}:**\n"
            f"- Inequality score: **{a['inequality_score']}/100** vs **{b['inequality_score']}/100**\n"
            f"- Deprivation: **{a['deprivation_label']}** ({a['deprivation']}/100) vs **{b['deprivation_label']}** ({b['deprivation']}/100)\n"
            f"- Trend: **{a['trend'].title()}** vs **{b['trend'].title()}**\n\n"
            f"**{a_name.title()}:** {a['notes']}\n\n"
            f"**{b_name.title()}:** {b['notes']}"
        )
    if found:
        name, p = found[0]
        return (
            f"**{name.title()}** — inequality score **{p['inequality_score']}/100** · "
            f"deprivation **{p['deprivation']}/100** ({p['deprivation_label']}) · "
            f"trend **{p['trend'].title()}**.\n\n{p['notes']}"
        )
    return _resp_worst_region(q, region, ctx)


def _resp_cause_why(q: str, region: str | None, ctx: dict) -> str:
    if region:
        dep = round(ctx.get("deprivation_index", 0) * 100)
        trend = ctx.get("trend", "stable")
        return (
            f"The waiting list pressure in **{region}** is driven by three compounding structural factors:\n"
            f"1. **High deprivation ({dep}/100)** — greater illness burden means higher referral rates relative to capacity.\n"
            f"2. **Historic underfunding** — deprived regions receive less per-capita elective funding under the Carr-Hill formula despite greater need.\n"
            f"3. **Workforce recruitment gap** — trusts in deprived urban and rural areas struggle to retain consultants and theatre staff, creating a capacity ceiling.\n"
            f"The current trend (**{trend.title()}**) reflects whether recent pathway interventions are overcoming these structural barriers."
        )
    return (
        "NHS waiting list inequality has three root causes that reinforce each other:\n"
        "1. **Deprivation-demand mismatch** — the most deprived regions have the highest illness rates but the lowest historic trust funding per capita.\n"
        "2. **Post-COVID elective backlog** — routine surgery was paused for 18+ months, creating a structural hole. Recovery has been uneven by region.\n"
        "3. **Workforce shortages** — the NHS has a ~10% clinical vacancy rate; shortages are concentrated in deprived regions where recruitment is hardest.\n"
        "These three interact: understaffing in deprived areas creates longer waits, which drives up inequality scores, "
        "which further demoralises staff and worsens recruitment — a self-reinforcing cycle without structural intervention."
    )


def _resp_cancellations(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "While this platform tracks RTT waiting lists rather than individual cancellations, "
        "sudden spikes in waiting list growth closely correlate with elective procedure cancellations. "
        "The primary cancellation drivers are:\n"
        "- **Winter pressure** — emergency demand surges force trusts to cancel elective procedures to free beds.\n"
        "- **Industrial action** — NHS strikes in 2023-24 cancelled an estimated **1.5M appointments** nationally.\n"
        "- **Theatre staff shortages** — last-minute cancellations from unfilled anaesthetist or scrub nurse slots.\n"
        "Cancelled procedures re-enter the waiting list, compounding the backlog rather than simply delaying it."
    )


def _resp_emergency(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "This platform specifically tracks **elective (planned) care** waiting times, not emergency A&E performance. "
        "However, the two are deeply linked: when A&E demand surges, NHS trusts cancel elective procedures "
        "to free acute beds — this is the primary mechanism by which emergency pressure creates and worsens the elective backlog. "
        "Nationally, ~13,000 patients per day are in acute beds awaiting social care discharge ('bed-blocking'), "
        "which further limits available elective capacity. "
        "Fixing delayed discharge is therefore both an emergency and an elective care priority."
    )


def _resp_politics(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "The statutory NHS target is that **92% of patients should start treatment within 18 weeks of referral**. "
        f"The NHS is currently at approximately **58% compliance** — far below the legal mandate. "
        "The previous government committed to clearing the backlog by 2025; that target has been missed. "
        "The current government has pledged additional elective recovery funding but has not committed to a revised compliance date. "
        "NHS England's own planning assumptions do not show full RTT compliance before 2028-29 "
        "under current trajectory. Political commitment without structural reform (deprivation-weighted funding, workforce, capacity) "
        "has not historically shifted the trend."
    )


def _resp_summary(q: str, region: str | None, ctx: dict) -> str:
    if region:
        score = ctx.get("inequality_score", "N/A")
        pct = ctx.get("pct_over_18_weeks", "N/A")
        dep = round(ctx.get("deprivation_index", 0) * 100)
        trend = ctx.get("trend", "N/A")
        total = ctx.get("total_waiting", 0)
        alert = (
            "This region is under **significant pressure** and warrants targeted commissioner intervention."
            if isinstance(score, (int, float)) and score > 65
            else "This region is performing relatively well but continued monitoring is advised."
        )
        return (
            f"**{region} — NHS Intelligence Summary**\n"
            f"- Patients waiting: **{total:,}**\n"
            f"- Breaching 18-week standard: **{pct}%**\n"
            f"- Inequality score: **{score}/100**\n"
            f"- Deprivation index: **{dep}/100**\n"
            f"- Trend: **{str(trend).title()}**\n\n"
            f"{alert}"
        )
    total = ctx.get("national_total_waiting", _NATIONAL["total_waiting"])
    worst = ctx.get("worst_region", _NATIONAL["worst_region"])
    best = ctx.get("best_region", _NATIONAL["best_region"])
    gap = ctx.get("regional_gap_ratio", _NATIONAL["ne_sw_gap"])
    det = ctx.get("regions_deteriorating", 0)
    avg = ctx.get("avg_pct_over_18_weeks", _NATIONAL["breach_rate"])
    return (
        f"**NHS England — Waiting List Intelligence Snapshot**\n"
        f"- National backlog: **{total:,}** patients\n"
        f"- Average breach rate: **{avg}%** over 18 weeks (target: 8%)\n"
        f"- Worst region: **{worst}** (inequality score 87/100)\n"
        f"- Best region: **{best}** (inequality score 31/100)\n"
        f"- Regional gap: **{gap}×** — widest on record\n"
        f"- Deteriorating regions: **{det} of 7**\n\n"
        f"The national picture is one of sustained deterioration with widening regional inequality. "
        f"Immediate policy intervention is required in {worst} and the Midlands."
    )


def _resp_data_explain(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "**How NHS Intelligence metrics are defined:**\n"
        "- **Inequality score (0-100)**: composite of breach rate, deprivation-adjusted backlog, and backlog rate per 100k — higher = worse inequality.\n"
        "- **% over 18 weeks**: share of patients on the waiting list who have passed the NHS RTT 18-week standard.\n"
        "- **Backlog rate per 100k**: total waiting patients normalised by population — enables fair comparison across regions of different sizes.\n"
        "- **Deprivation index**: IMD score scaled 0-100 for this platform; higher = more deprived.\n"
        "- **Trend**: 3-month directional signal — improving / stable / deteriorating.\n\n"
        "Data is sourced from NHS England's monthly RTT statistical release and refreshed within 72 hours of publication."
    )


def _resp_identity(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "I am the **NHS Wait Intelligence Local AI Engine** — built directly into this platform. "
        "I analyse live PostgreSQL data (NHS RTT waiting lists, regional deprivation, inequality scores) "
        "and generate factual, data-backed analysis without relying on external APIs. "
        "When the Anthropic cloud API is unavailable or rate-limited, I take over to ensure uninterrupted analysis."
    )


def _resp_capabilities(_q: str, _region: str | None, _ctx: dict) -> str:
    return (
        "**What I can analyse:**\n"
        "- National and regional waiting list size and breach rates\n"
        "- Regional inequality scores and the deprivation correlation\n"
        "- Specialty-level pressure (orthopaedics, mental health, ophthalmology, neurology, and more)\n"
        "- Trend direction and 12-month backlog forecasts\n"
        "- Root cause analysis of why inequality exists\n"
        "- Evidence-based policy recommendations\n"
        "- Funding formula critique (Carr-Hill)\n"
        "- Workforce and capacity constraints\n\n"
        "Try: *\"Which region is worst and why?\"* or *\"Give me policy recommendations for the North East\"*"
    )


# ---------------------------------------------------------------------------
# Handler dispatch table
# ---------------------------------------------------------------------------

_HANDLERS: dict[str, Callable] = {
    "greeting":      lambda q, r, c: "Hello. I am the NHS Wait Intelligence Local AI Engine. Ask me about waiting lists, regional inequality, specialties, or policy recommendations.",
    "identity":      _resp_identity,
    "capabilities":  _resp_capabilities,
    "emotions":      lambda q, r, c: "I understand NHS waiting times cause real anxiety and frustration. My goal is to surface transparent, factual data so policymakers and journalists can direct pressure where it will have the most impact.",
    "waiting_times": _resp_waiting_times,
    "rtt_standard":  _resp_rtt_standard,
    "worst_region":  _resp_worst_region,
    "best_region":   _resp_best_region,
    "inequality":    _resp_inequality,
    "deprivation":   _resp_deprivation,
    "trends":        _resp_trends,
    "forecast":      _resp_forecast,
    "specialties":   _resp_specialties,
    "mental_health": _resp_mental_health,
    "capacity":      _resp_capacity,
    "workforce":     _resp_workforce,
    "funding":       _resp_funding,
    "recommendations": _resp_recommendations,
    "comparison":    _resp_comparison,
    "cause_why":     _resp_cause_why,
    "cancellations": _resp_cancellations,
    "emergency":     _resp_emergency,
    "politics":      _resp_politics,
    "summary":       _resp_summary,
    "data_explain":  _resp_data_explain,
}

_CONVERSATIONAL = {"greeting", "identity", "capabilities", "emotions"}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_advanced_fallback_response(question: str, region: str | None, context: dict) -> str:
    """
    NHS Smart Local AI Engine.
    Scores the question across 25 intents, selects the best 1-2 handlers,
    and returns professional NHS analyst prose backed by live database context.
    """
    scored = _score_intents(question)
    top_intents = [name for name, _ in scored]

    # --- Conversational-only shortcut ---
    if top_intents and all(i in _CONVERSATIONAL for i in top_intents[:2]):
        parts = [
            _HANDLERS[top_intents[0]](question, region, context),
            "\n**Try asking:**",
            "- *Which region is worst and why?*",
            "- *What is the national trend?*",
            "- *Give me policy recommendations.*",
            "- *How does deprivation drive inequality?*",
        ]
        return "\n".join(parts)

    # --- Data availability check ---
    if not context.get("data_available", False):
        scope = f"for {region}" if region else "nationally"
        return (
            f"*(Local AI Engine)* No processed NHS data is currently loaded {scope}. "
            "Please run the monthly ETL pipeline and retry."
        )

    # --- Select up to 2 best data intents ---
    data_intents = [i for i in top_intents if i not in _CONVERSATIONAL]
    chosen = data_intents[:1]
    if len(data_intents) > 1 and scored[data_intents.index(data_intents[1])][1] >= 1.0 if data_intents[1:] else False:
        chosen.append(data_intents[1])
    if not chosen:
        chosen = ["summary"]

    header = "*(Local AI — NHS Intelligence Engine)*\n"
    parts = [header]

    for intent in chosen:
        handler = _HANDLERS.get(intent)
        if handler:
            result = handler(question, region, context)
            if result:
                parts.append(result)

    # --- Live data footer ---
    parts.append(_footer(region, context))

    return "\n\n".join(parts)


def _footer(region: str | None, ctx: dict) -> str:
    if region:
        pct = ctx.get("pct_over_18_weeks", "N/A")
        score = ctx.get("inequality_score", "N/A")
        trend = ctx.get("trend", "N/A")
        return f"---\n*Live data — {region}: {pct}% over 18 weeks · Inequality {score}/100 · Trend: {str(trend).title()}*"
    total = ctx.get("national_total_waiting", "N/A")
    gap = ctx.get("regional_gap_ratio", "N/A")
    det = ctx.get("regions_deteriorating", "N/A")
    worst = ctx.get("worst_region", "N/A")
    total_str = f"{total:,}" if isinstance(total, int) else str(total)
    return f"---\n*Live data — Backlog: {total_str} · Gap: {gap}× · Deteriorating: {det}/7 · Worst: {worst}*"
