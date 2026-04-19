from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from ..database import get_db
from ..models import ProcessedMetric, Region
import statistics

router = APIRouter()

class AnomalyAlert(BaseModel):
    region: str
    metric: str
    value: float
    expected: float
    z_score: float
    description: str
    severity: str

@router.get("/anomalies", response_model=List[AnomalyAlert])
def get_anomalies(db: Session = Depends(get_db)):
    """
    Detects statistical anomalies using z-scores on current metrics.
    """
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if not latest_month:
        return []

    rows = db.query(ProcessedMetric, Region).join(Region).filter(
        ProcessedMetric.snapshot_month == latest_month
    ).all()
    
    if len(rows) < 3:
        return []

    # Calculate mean and stdev for inequality score
    scores = [m.inequality_score for m, _ in rows]
    mean_score = statistics.mean(scores)
    stdev_score = statistics.stdev(scores) if len(scores) > 1 else 1

    alerts = []
    for metric, region in rows:
        z_score = (metric.inequality_score - mean_score) / stdev_score
        
        if z_score > 1.5:  # Arbitrary threshold to find anomalies
            alerts.append(AnomalyAlert(
                region=region.name,
                metric="Inequality Score",
                value=round(metric.inequality_score, 1),
                expected=round(mean_score, 1),
                z_score=round(z_score, 2),
                description=f"Inequality score is dangerously high, {round(z_score, 1)}σ above national average.",
                severity="High" if z_score > 2 else "Medium"
            ))
            
    return sorted(alerts, key=lambda a: a.z_score, reverse=True)
