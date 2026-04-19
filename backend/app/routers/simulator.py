from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import ProcessedMetric, Region
from ..config import settings

router = APIRouter()

class InterventionRequest(BaseModel):
    region: str
    teams_added: int
    months: int

class ScenarioRequest(BaseModel):
    region: str

class ScenarioComparison(BaseModel):
    scenario: str
    description: str
    projected_reduction: int
    cost_estimate: float
    time_to_impact_months: int

class ResourceAllocation(BaseModel):
    region: str
    recommended_teams: int
    estimated_reduction: int
    roi_score: float

@router.post("/simulate/intervention")
def simulate_intervention(payload: InterventionRequest, db: Session = Depends(get_db)):
    """
    Heuristic-based simulation of intervention impact.
    Assumes 1 surgical team can process ~40 patients/month.
    """
    baseline_reduction = payload.teams_added * 40 * payload.months
    
    # Adding confidence intervals
    return {
        "region": payload.region,
        "months": payload.months,
        "teams_added": payload.teams_added,
        "baseline_reduction": baseline_reduction,
        "optimistic_reduction": int(baseline_reduction * 1.2),
        "pessimistic_reduction": int(baseline_reduction * 0.8)
    }

@router.get("/simulate/optimize", response_model=List[ResourceAllocation])
def optimize_resources(db: Session = Depends(get_db)):
    """
    Suggests resource allocation based on inequality scores.
    """
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if not latest_month:
        return []

    rows = db.query(ProcessedMetric, Region).join(Region).filter(
        ProcessedMetric.snapshot_month == latest_month
    ).order_by(ProcessedMetric.inequality_score.desc()).limit(5).all()

    allocations = []
    total_budget_teams = 20 # fixed pool for simulation
    
    for idx, (metric, region) in enumerate(rows):
        teams = max(1, int(total_budget_teams * (metric.inequality_score / 500)))
        roi = round((metric.inequality_score * teams) / 100, 2)
        allocations.append(ResourceAllocation(
            region=region.name,
            recommended_teams=teams,
            estimated_reduction=teams * 40 * 6,
            roi_score=roi
        ))
        
    return allocations

@router.post("/simulate/scenarios", response_model=List[ScenarioComparison])
def compare_scenarios(payload: ScenarioRequest, db: Session = Depends(get_db)):
    return [
        ScenarioComparison(
            scenario="Outsourcing",
            description="Use private sector capacity for low-acuity cases",
            projected_reduction=2500,
            cost_estimate=1.2,
            time_to_impact_months=1
        ),
        ScenarioComparison(
            scenario="Capacity Increase",
            description="Hire 5 new surgical teams and extend weekend hours",
            projected_reduction=1800,
            cost_estimate=2.5,
            time_to_impact_months=3
        ),
        ScenarioComparison(
            scenario="Triage Changes",
            description="Implement AI-driven triage to prioritize highest-need",
            projected_reduction=800,
            cost_estimate=0.3,
            time_to_impact_months=1
        )
    ]
