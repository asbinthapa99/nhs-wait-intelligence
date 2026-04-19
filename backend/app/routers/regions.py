from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import ProcessedMetric, Region
from ..schemas.responses import RegionDetail
from ..services.region_assets import get_region_asset_fields

router = APIRouter()

REGION_GEO: dict[str, dict] = {
    "Y63": {
        "region_center_lat": 54.2,
        "region_center_lng": -1.5,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-3.4, 55.7], [0.4, 55.7], [0.5, 53.1], [-2.6, 53.0], [-3.4, 55.7]]],
        },
    },
    "Y60": {
        "region_center_lat": 52.6,
        "region_center_lng": -1.9,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-3.1, 53.4], [-0.1, 53.4], [0.1, 51.7], [-2.8, 51.6], [-3.1, 53.4]]],
        },
    },
    "Y62": {
        "region_center_lat": 53.6,
        "region_center_lng": -2.7,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-3.9, 55.2], [-1.8, 55.2], [-1.8, 52.9], [-3.8, 52.9], [-3.9, 55.2]]],
        },
    },
    "Y61": {
        "region_center_lat": 52.3,
        "region_center_lng": 0.4,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[0.9, 53.1], [1.9, 52.8], [1.3, 51.8], [-0.1, 51.8], [-0.3, 52.7], [0.9, 53.1]]],
        },
    },
    "Y56": {
        "region_center_lat": 51.51,
        "region_center_lng": -0.1,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-0.51, 51.7], [0.29, 51.7], [0.29, 51.28], [-0.51, 51.28], [-0.51, 51.7]]],
        },
    },
    "Y59": {
        "region_center_lat": 51.0,
        "region_center_lng": -0.2,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-1.9, 51.9], [1.5, 51.7], [1.6, 50.6], [-1.3, 50.6], [-1.9, 51.9]]],
        },
    },
    "Y58": {
        "region_center_lat": 50.7,
        "region_center_lng": -3.7,
        "boundary_geojson": {
            "type": "Polygon",
            "coordinates": [[[-6.3, 51.6], [-2.0, 51.5], [-1.9, 49.9], [-5.8, 49.9], [-6.3, 51.6]]],
        },
    },
}


def with_geo(region_detail: RegionDetail) -> RegionDetail:
    geo = REGION_GEO.get(region_detail.region_code, {})
    dynamic_geo = get_region_asset_fields(region_detail.name)
    return region_detail.model_copy(
        update={
            "region_center_lat": dynamic_geo.get("region_center_lat") or geo.get("region_center_lat"),
            "region_center_lng": dynamic_geo.get("region_center_lng") or geo.get("region_center_lng"),
            "boundary_geojson": dynamic_geo.get("boundary_geojson") or geo.get("boundary_geojson"),
        }
    )


@router.get("/regions", response_model=list[RegionDetail])
def get_regions(db: Session = Depends(get_db)) -> list[RegionDetail]:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if latest_month is None:
        return []

    rows = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month)
        .all()
    )
    return [
        with_geo(RegionDetail(
            id=r.id,
            name=r.name,
            region_code=r.region_code,
            inequality_score=m.inequality_score,
            backlog_rate_per_100k=m.backlog_rate_per_100k,
            deprivation_index=r.deprivation_index,
            trend=m.trend,
            total_waiting=m.total_waiting,
            pct_over_18_weeks=m.pct_over_18_weeks,
        ))
        for m, r in rows
    ]


@router.get("/regions/{region_id}", response_model=RegionDetail)
def get_region(region_id: int, db: Session = Depends(get_db)) -> RegionDetail:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if latest_month is None:
        raise HTTPException(status_code=404, detail="Region not found")

    row = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month, Region.id == region_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Region not found")
    m, r = row
    return with_geo(RegionDetail(
        id=r.id, name=r.name, region_code=r.region_code,
        inequality_score=m.inequality_score, backlog_rate_per_100k=m.backlog_rate_per_100k,
        deprivation_index=r.deprivation_index, trend=m.trend,
        total_waiting=m.total_waiting, pct_over_18_weeks=m.pct_over_18_weeks,
    ))
