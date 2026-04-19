"""
Persist 6-month forecasts into the forecasts table.
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.services.forecasting import linear_forecast  # noqa: E402


def _add_months(base: date, months: int) -> date:
    year = base.year + ((base.month - 1 + months) // 12)
    month = ((base.month - 1 + months) % 12) + 1
    return date(year, month, 1)


def persist_forecasts(engine) -> int:
    Session = sessionmaker(bind=engine)
    session = Session()

    rows = session.execute(
        text("""
            SELECT region_id, snapshot_month, total_waiting
            FROM processed_metrics
            ORDER BY region_id ASC, snapshot_month ASC
        """)
    ).fetchall()

    if not rows:
        session.close()
        return 0

    grouped: dict[int, list[tuple[date, float]]] = {}
    for region_id, snapshot_month, total_waiting in rows:
        grouped.setdefault(region_id, []).append((snapshot_month, float(total_waiting)))

    session.execute(text("DELETE FROM forecasts"))

    inserted = 0
    for region_id, points in grouped.items():
        values = [value for _, value in points]
        last_month = points[-1][0]
        forecast_points = linear_forecast(values, steps=6)

        for point in forecast_points:
            session.execute(
                text("""
                    INSERT INTO forecasts
                      (region_id, forecast_month, predicted_waiting, lower_bound, upper_bound, model, generated_at)
                    VALUES
                      (:region_id, :forecast_month, :predicted_waiting, :lower_bound, :upper_bound, :model, :generated_at)
                """),
                {
                    "region_id": region_id,
                    "forecast_month": _add_months(last_month, point.month_offset),
                    "predicted_waiting": point.predicted,
                    "lower_bound": point.lower,
                    "upper_bound": point.upper,
                    "model": "linear_regression",
                    "generated_at": date.today(),
                },
            )
            inserted += 1

    session.commit()
    session.close()
    return inserted


if __name__ == "__main__":
    from sqlalchemy import create_engine

    print(persist_forecasts(create_engine(DATABASE_URL)))
