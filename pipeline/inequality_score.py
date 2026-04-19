"""
Compute inequality scores and populate processed_metrics table.

Score formula:
  (pct_over_18_weeks × 0.40) + (backlog_growth_rate × 0.35) + (deprivation × 100 × 0.25)
  Normalised 0–100. Higher = worse.
"""

import logging
from datetime import date

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL

log = logging.getLogger(__name__)

WEIGHT_PCT = 0.40
WEIGHT_GROWTH = 0.35
WEIGHT_DEPRIVATION = 0.25


def compute_backlog_growth(current: int, previous: int) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 2)


def classify_trend(current_score: float, previous_score: float | None) -> str:
    if previous_score is None:
        return "stable"
    if current_score - previous_score > 2.0:
        return "deteriorating"
    if previous_score - current_score > 2.0:
        return "improving"
    return "stable"


def compute_score(pct_over_18: float, growth_rate: float, deprivation: float) -> float:
    raw = pct_over_18 * WEIGHT_PCT + growth_rate * WEIGHT_GROWTH + deprivation * 100 * WEIGHT_DEPRIVATION
    return round(min(max(raw, 0.0), 100.0), 1)


def run(engine=None) -> int:
    if engine is None:
        engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    months = session.execute(
        text("SELECT DISTINCT snapshot_month FROM waiting_lists ORDER BY snapshot_month")
    ).fetchall()

    if not months:
        log.warning("No waiting list data found — skipping metric computation")
        session.close()
        return 0

    regions = session.execute(
        text("SELECT id, name, deprivation_index, population FROM regions")
    ).fetchall()

    inserted = 0
    prev_totals: dict[int, tuple[int, float]] = {}

    for (month,) in months:
        for region_id, region_name, deprivation, population in regions:
            agg = session.execute(
                text("""
                    SELECT SUM(total_waiting), AVG(pct_over_18_weeks)
                    FROM waiting_lists
                    WHERE region_id = :rid AND snapshot_month = :month
                """),
                {"rid": region_id, "month": month},
            ).fetchone()

            if not agg or agg[0] is None:
                continue

            total_waiting, avg_pct = int(agg[0]), float(agg[1])
            pop = population or 1_000_000
            backlog_rate = round(total_waiting / pop * 100_000, 1)

            prev_total, prev_score = prev_totals.get(region_id, (total_waiting, None))
            growth_rate = compute_backlog_growth(total_waiting, prev_total)
            score = compute_score(avg_pct, growth_rate, deprivation)
            trend = classify_trend(score, prev_score)

            session.execute(
                text("""
                    INSERT INTO processed_metrics
                      (region_id, snapshot_month, inequality_score, backlog_rate_per_100k,
                       backlog_growth_rate, total_waiting, pct_over_18_weeks, trend)
                    VALUES
                      (:rid, :month, :score, :rate, :growth, :total, :pct, :trend)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "rid": region_id,
                    "month": month,
                    "score": score,
                    "rate": backlog_rate,
                    "growth": growth_rate,
                    "total": total_waiting,
                    "pct": round(avg_pct, 2),
                    "trend": trend,
                },
            )
            prev_totals[region_id] = (total_waiting, score)
            inserted += 1

    session.commit()
    session.close()
    log.info(f"Computed {inserted} metric records")
    return inserted


if __name__ == "__main__":
    run()
