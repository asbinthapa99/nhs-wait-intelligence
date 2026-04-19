"""
Inequality score: (pct_over_18w × 0.40) + (backlog_growth × 0.35) + (deprivation × 0.25)
Normalised 0–100. Higher = worse.
"""

WEIGHT_PCT_OVER_18W = 0.40
WEIGHT_BACKLOG_GROWTH = 0.35
WEIGHT_DEPRIVATION = 0.25


def compute_score(
    pct_over_18_weeks: float,
    backlog_growth_rate: float,
    deprivation_index: float,
) -> float:
    raw = (
        pct_over_18_weeks * WEIGHT_PCT_OVER_18W
        + backlog_growth_rate * WEIGHT_BACKLOG_GROWTH
        + deprivation_index * 100 * WEIGHT_DEPRIVATION
    )
    return round(min(max(raw, 0.0), 100.0), 1)


def classify_trend(current: float, previous: float | None) -> str:
    if previous is None:
        return "stable"
    delta = current - previous
    if delta > 2.0:
        return "deteriorating"
    if delta < -2.0:
        return "improving"
    return "stable"
