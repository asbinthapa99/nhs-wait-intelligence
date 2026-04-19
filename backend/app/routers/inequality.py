from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import ProcessedMetric, Region
from ..schemas.responses import InequalityResponse, InequalityRegion
from ..services.clustering import get_trust_clusters

router = APIRouter()


def _empty_inequality() -> InequalityResponse:
    return InequalityResponse(
        regions=[],
        gap_ratio=0.0,
        best_region="",
        worst_region="",
    )


@router.get("/inequality", response_model=InequalityResponse)
def get_inequality(db: Session = Depends(get_db)) -> InequalityResponse:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if latest_month is None:
        return _empty_inequality()

    rows = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month)
        .all()
    )

    regions = [
        InequalityRegion(
            id=r.id,
            name=r.name,
            score=m.inequality_score,
            deprivation_index=r.deprivation_index,
            backlog_rate=m.backlog_rate_per_100k,
            pct_over_18_weeks=m.pct_over_18_weeks,
            trend=m.trend,
        )
        for m, r in rows
    ]
    if not regions:
        return _empty_inequality()

    scores = [reg.score for reg in regions]
    best = min(regions, key=lambda x: x.score)
    worst = max(regions, key=lambda x: x.score)
    gap_ratio = round(worst.score / best.score, 1) if best.score > 0 else 0.0

    return InequalityResponse(
        regions=regions,
        gap_ratio=gap_ratio,
        best_region=best.name,
        worst_region=worst.name,
    )

@router.get("/inequality/clusters")
def get_clusters(db: Session = Depends(get_db)):
    """Groups Regions/Trusts into mathematically similar cohorts."""
    return get_trust_clusters(db)
