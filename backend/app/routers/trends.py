from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from ..database import get_db
from ..models import ProcessedMetric, Region, Forecast
from ..schemas.responses import TrendsResponse, TrendSeries, ForecastSeries, MonthlyPoint, ForecastPoint
from ..services.forecasting import linear_forecast

router = APIRouter()


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    regions: str | None = Query(None, description="Comma-separated region names"),
    db: Session = Depends(get_db),
) -> TrendsResponse:
    region_filter = [r.strip() for r in regions.split(",")] if regions else None

    query = db.query(ProcessedMetric, Region).join(Region)
    if region_filter:
        query = query.filter(Region.name.in_(region_filter))

    rows = query.order_by(Region.name, ProcessedMetric.snapshot_month).all()

    by_region: dict[str, list[tuple[date, float]]] = {}
    for m, r in rows:
        by_region.setdefault(r.name, []).append((m.snapshot_month, m.total_waiting / 1_000_000))

    if not by_region:
        return TrendsResponse(regions=[], series=[], forecast=[])

    series = [
        TrendSeries(
            region=name,
            data=[MonthlyPoint(month=d.strftime("%b %y"), value=round(v, 2)) for d, v in points],
        )
        for name, points in by_region.items()
    ]

    forecast: list[ForecastSeries] = []
    for name, points in by_region.items():
        region_row = next((row for row in rows if row[1].name == name), None)
        region_id = region_row[1].id if region_row else None

        stored_forecasts = []
        if region_id is not None:
            stored_forecasts = (
                db.query(Forecast)
                .filter(Forecast.region_id == region_id)
                .order_by(Forecast.forecast_month.asc())
                .all()
            )

        if stored_forecasts:
            forecast_points = [
                ForecastPoint(
                    month=item.forecast_month.strftime("%b %y"),
                    predicted=round(item.predicted_waiting / 1_000_000, 2),
                    lower=round(item.lower_bound / 1_000_000, 2),
                    upper=round(item.upper_bound / 1_000_000, 2),
                )
                for item in stored_forecasts
            ]
        else:
            vals = [v for _, v in points]
            fc = linear_forecast(vals)
            forecast_points = [
                ForecastPoint(
                    month=f"M+{p.month_offset}",
                    predicted=p.predicted,
                    lower=p.lower,
                    upper=p.upper,
                )
                for p in fc
            ]

        forecast.append(ForecastSeries(
            region=name,
            data=forecast_points,
        ))

    return TrendsResponse(regions=list(by_region.keys()), series=series, forecast=forecast)
