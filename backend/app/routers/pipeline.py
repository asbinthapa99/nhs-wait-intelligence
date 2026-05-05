from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Forecast, ProcessedMetric, WaitingList
from ..schemas.responses import PipelineStatusResponse

router = APIRouter()

_STALE_DAYS = 45


@router.get("/pipeline/status", response_model=PipelineStatusResponse, tags=["pipeline"])
def get_pipeline_status(db: Session = Depends(get_db)) -> PipelineStatusResponse:
    latest_snapshot = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    waiting_rows = db.query(func.count(WaitingList.id)).scalar() or 0
    metric_rows = db.query(func.count(ProcessedMetric.id)).scalar() or 0
    forecast_rows = db.query(func.count(Forecast.id)).scalar() or 0

    days_since: int | None = None
    stale = True

    if latest_snapshot is not None:
        days_since = (date.today() - latest_snapshot).days
        stale = days_since > _STALE_DAYS

    healthy = metric_rows > 0 and not stale

    if metric_rows == 0:
        message = (
            "No data ingested yet. Run the pipeline to populate the database: "
            "`cd pipeline && python run_pipeline.py`"
        )
    elif stale:
        message = (
            f"Data is {days_since} days old (threshold: {_STALE_DAYS} days). "
            "Trigger a manual refresh via GitHub Actions → Daily Data Refresh → Run workflow."
        )
    else:
        message = f"Pipeline healthy. Last snapshot: {latest_snapshot} ({days_since} days ago)."

    return PipelineStatusResponse(
        healthy=healthy,
        latest_snapshot_month=latest_snapshot,
        days_since_snapshot=days_since,
        waiting_list_rows=waiting_rows,
        processed_metric_rows=metric_rows,
        forecast_rows=forecast_rows,
        stale=stale,
        stale_threshold_days=_STALE_DAYS,
        message=message,
    )
