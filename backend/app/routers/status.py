from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Forecast, ProcessedMetric, WaitingList
from ..schemas.responses import DataStatusResponse, RttArchiveItem, RttArchiveResponse

router = APIRouter()

RTT_ARCHIVE_ZIP_DIR = Path(__file__).resolve().parents[3] / "pipeline" / "data" / "raw" / "rtt" / "archive" / "zips"
RTT_ARCHIVE_CSV_DIR = Path(__file__).resolve().parents[3] / "pipeline" / "data" / "raw" / "rtt" / "archive" / "csv"


@router.get("/status/data", response_model=DataStatusResponse)
def get_data_status(db: Session = Depends(get_db)) -> DataStatusResponse:
    latest_processed_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    latest_waiting_month = db.query(func.max(WaitingList.snapshot_month)).scalar()
    latest_forecast_month = db.query(func.max(Forecast.forecast_month)).scalar()

    processed_metric_rows = db.query(func.count(ProcessedMetric.id)).scalar() or 0
    waiting_list_rows = db.query(func.count(WaitingList.id)).scalar() or 0
    forecast_rows = db.query(func.count(Forecast.id)).scalar() or 0

    regions_in_latest_snapshot = 0
    if latest_processed_month is not None:
        regions_in_latest_snapshot = (
            db.query(func.count(func.distinct(ProcessedMetric.region_id)))
            .filter(ProcessedMetric.snapshot_month == latest_processed_month)
            .scalar()
            or 0
        )

    specialties_in_latest_snapshot = 0
    if latest_waiting_month is not None:
        specialties_in_latest_snapshot = (
            db.query(func.count(func.distinct(WaitingList.specialty)))
            .filter(WaitingList.snapshot_month == latest_waiting_month)
            .scalar()
            or 0
        )

    forecast_regions = db.query(func.count(func.distinct(Forecast.region_id))).scalar() or 0

    latest_snapshot = latest_processed_month or latest_waiting_month
    days_since_latest_snapshot = None
    if latest_snapshot is not None:
        days_since_latest_snapshot = (date.today() - latest_snapshot).days

    has_live_data = processed_metric_rows > 0 or waiting_list_rows > 0

    return DataStatusResponse(
        has_live_data=has_live_data,
        latest_processed_month=latest_processed_month,
        latest_waiting_month=latest_waiting_month,
        latest_forecast_month=latest_forecast_month,
        regions_in_latest_snapshot=regions_in_latest_snapshot,
        specialties_in_latest_snapshot=specialties_in_latest_snapshot,
        forecast_regions=forecast_regions,
        processed_metric_rows=processed_metric_rows,
        waiting_list_rows=waiting_list_rows,
        forecast_rows=forecast_rows,
        days_since_latest_snapshot=days_since_latest_snapshot,
        refresh_recommended=days_since_latest_snapshot is None or days_since_latest_snapshot > 45,
    )


@router.get("/status/rtt-archive", response_model=RttArchiveResponse)
def get_rtt_archive() -> RttArchiveResponse:
    if not RTT_ARCHIVE_ZIP_DIR.exists():
        return RttArchiveResponse(total_archives=0, latest_archive=None, archives=[])

    archives: list[RttArchiveItem] = []
    for zip_path in sorted(RTT_ARCHIVE_ZIP_DIR.glob("*.zip"), key=lambda path: path.stat().st_mtime, reverse=True):
        archive_stem = zip_path.stem
        csv_dir = RTT_ARCHIVE_CSV_DIR / archive_stem
        csv_filenames = sorted([path.name for path in csv_dir.glob("*.csv")]) if csv_dir.exists() else []
        downloaded_at = date.fromtimestamp(zip_path.stat().st_mtime)

        archives.append(
            RttArchiveItem(
                zip_filename=zip_path.name,
                csv_filenames=csv_filenames,
                zip_size_bytes=zip_path.stat().st_size,
                downloaded_at=downloaded_at,
            )
        )

    return RttArchiveResponse(
        total_archives=len(archives),
        latest_archive=archives[0] if archives else None,
        archives=archives,
    )
