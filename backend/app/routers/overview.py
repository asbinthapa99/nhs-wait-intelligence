from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import ProcessedMetric, Region, WaitingList
from ..schemas.responses import OverviewResponse, MonthlyPoint, RegionScore
from fastapi_cache.decorator import cache

router = APIRouter()


def _empty_overview() -> OverviewResponse:
    return OverviewResponse(
        total_waiting=0,
        pct_over_18_weeks=0.0,
        regional_gap=0.0,
        improving_regions=0,
        total_regions=0,
        monthly_trend=[],
        worst_regions=[],
        ai_summary="No processed NHS data is available yet. Run the pipeline to populate the dashboard.",
    )


@router.get("/overview", response_model=OverviewResponse)
@cache(expire=3600)
def get_overview(db: Session = Depends(get_db)) -> OverviewResponse:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if latest_month is None:
        return _empty_overview()

    metrics = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month)
        .all()
    )
    if not metrics:
        return _empty_overview()

    total_waiting = sum(m.total_waiting for m, _ in metrics)
    avg_pct = sum(m.pct_over_18_weeks for m, _ in metrics) / len(metrics)
    scores = [m.inequality_score for m, _ in metrics]
    gap = round(max(scores) / min(scores), 1) if min(scores) > 0 else 0.0
    improving = sum(1 for m, _ in metrics if m.trend == "improving")

    worst = sorted(metrics, key=lambda x: x[0].inequality_score, reverse=True)[:5]
    worst_regions = [
        RegionScore(name=r.name, score=m.inequality_score, trend=m.trend)
        for m, r in worst
    ]

    monthly = (
        db.query(
            WaitingList.snapshot_month.label("snapshot_month"),
            func.sum(WaitingList.total_waiting).label("value"),
        )
        .group_by(WaitingList.snapshot_month)
        .order_by(WaitingList.snapshot_month)
        .limit(24)
        .all()
    )
    trend = [
        MonthlyPoint(month=row.snapshot_month.strftime("%b %y"), value=round(row.value / 1_000_000, 2))
        for row in monthly
    ]

    return OverviewResponse(
        total_waiting=total_waiting,
        pct_over_18_weeks=round(avg_pct, 1),
        regional_gap=gap,
        improving_regions=improving,
        total_regions=len(metrics),
        monthly_trend=trend,
        worst_regions=worst_regions,
        ai_summary=(
            f"Based on {latest_month.strftime('%B %Y')} data: {len(metrics)} NHS regions tracked. "
            f"National backlog {total_waiting:,}. Average {avg_pct:.1f}% waiting over 18 weeks."
        ),
    )
