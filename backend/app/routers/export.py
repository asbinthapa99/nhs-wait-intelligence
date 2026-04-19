from __future__ import annotations

import csv
from io import StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Forecast, ProcessedMetric, Region, WaitingList

router = APIRouter()


def _csv_response(filename: str, header: list[str], rows: list[list[object]]) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/inequality.csv")
def export_inequality_csv(db: Session = Depends(get_db)) -> Response:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if not latest_month:
        return _csv_response(
            "nhs-inequality-data.csv",
            ["region", "inequality_score", "deprivation_index", "backlog_rate_per_100k", "pct_over_18_weeks", "trend"],
            [],
        )

    rows = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month)
        .order_by(ProcessedMetric.inequality_score.desc(), Region.name.asc())
        .all()
    )
    csv_rows = [
        [
            region.name,
            metric.inequality_score,
            region.deprivation_index,
            metric.backlog_rate_per_100k,
            metric.pct_over_18_weeks,
            metric.trend,
        ]
        for metric, region in rows
    ]
    return _csv_response(
        "nhs-inequality-data.csv",
        ["region", "inequality_score", "deprivation_index", "backlog_rate_per_100k", "pct_over_18_weeks", "trend"],
        csv_rows,
    )


@router.get("/export/specialties.csv")
def export_specialties_csv(db: Session = Depends(get_db)) -> Response:
    latest_month = db.query(func.max(WaitingList.snapshot_month)).scalar()
    if not latest_month:
        return _csv_response(
            "nhs-specialties.csv",
            ["specialty", "total_waiting", "pct_over_18_weeks"],
            [],
        )

    rows = (
        db.query(
            WaitingList.specialty,
            func.sum(WaitingList.total_waiting).label("total_waiting"),
            func.avg(WaitingList.pct_over_18_weeks).label("pct_over_18_weeks"),
        )
        .filter(WaitingList.snapshot_month == latest_month)
        .group_by(WaitingList.specialty)
        .order_by(func.sum(WaitingList.total_waiting).desc(), WaitingList.specialty.asc())
        .all()
    )
    csv_rows = [
        [row.specialty, int(row.total_waiting), round(float(row.pct_over_18_weeks), 1)]
        for row in rows
    ]
    return _csv_response(
        "nhs-specialties.csv",
        ["specialty", "total_waiting", "pct_over_18_weeks"],
        csv_rows,
    )


@router.get("/export/trends.csv")
def export_trends_csv(
    regions: str | None = Query(None, description="Comma-separated region names"),
    db: Session = Depends(get_db),
) -> Response:
    region_filter = [value.strip() for value in regions.split(",")] if regions else None

    historical_query = (
        db.query(Region.name, ProcessedMetric.snapshot_month, ProcessedMetric.total_waiting)
        .join(ProcessedMetric, ProcessedMetric.region_id == Region.id)
        .order_by(Region.name.asc(), ProcessedMetric.snapshot_month.asc())
    )
    if region_filter:
        historical_query = historical_query.filter(Region.name.in_(region_filter))

    historical_rows = [
        [name, snapshot_month.isoformat(), int(total_waiting), "actual", "", ""]
        for name, snapshot_month, total_waiting in historical_query.all()
    ]

    forecast_query = (
        db.query(Region.name, Forecast.forecast_month, Forecast.predicted_waiting, Forecast.lower_bound, Forecast.upper_bound)
        .join(Forecast, Forecast.region_id == Region.id)
        .order_by(Region.name.asc(), Forecast.forecast_month.asc())
    )
    if region_filter:
        forecast_query = forecast_query.filter(Region.name.in_(region_filter))

    forecast_rows = [
        [
            name,
            forecast_month.isoformat(),
            round(predicted_waiting, 2),
            "forecast",
            round(lower_bound, 2),
            round(upper_bound, 2),
        ]
        for name, forecast_month, predicted_waiting, lower_bound, upper_bound in forecast_query.all()
    ]

    return _csv_response(
        "nhs-trends.csv",
        ["region", "month", "value", "series_type", "lower_bound", "upper_bound"],
        historical_rows + forecast_rows,
    )
