from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import WaitingList
from ..schemas.responses import SpecialtiesResponse, SpecialtyItem

router = APIRouter()


def _empty_specialties() -> SpecialtiesResponse:
    return SpecialtiesResponse(specialties=[], worst_specialty="")


@router.get("/specialties", response_model=SpecialtiesResponse)
def get_specialties(db: Session = Depends(get_db)) -> SpecialtiesResponse:
    months = [
        row[0]
        for row in db.query(WaitingList.snapshot_month)
        .distinct()
        .order_by(WaitingList.snapshot_month.asc())
        .all()
    ]
    if not months:
        return _empty_specialties()

    latest_month = months[-1]
    year_ago_month = months[-13] if len(months) >= 13 else None

    rows = (
        db.query(
            WaitingList.specialty,
            func.sum(WaitingList.total_waiting).label("total_waiting"),
            func.avg(WaitingList.pct_over_18_weeks).label("pct_over_18_weeks"),
        )
        .filter(WaitingList.snapshot_month == latest_month)
        .group_by(WaitingList.specialty)
        .order_by(func.sum(WaitingList.total_waiting).desc())
        .limit(20)
        .all()
    )

    previous_totals: dict[str, int] = {}
    if year_ago_month is not None:
        previous_rows = (
            db.query(
                WaitingList.specialty,
                func.sum(WaitingList.total_waiting).label("total_waiting"),
            )
            .filter(WaitingList.snapshot_month == year_ago_month)
            .group_by(WaitingList.specialty)
            .all()
        )
        previous_totals = {
            row.specialty: int(row.total_waiting)
            for row in previous_rows
        }

    specialties = [
        SpecialtyItem(
            name=row.specialty,
            total_waiting=int(row.total_waiting),
            pct_over_18_weeks=round(row.pct_over_18_weeks, 1),
            yoy_change=round(
                ((int(row.total_waiting) - previous_totals[row.specialty]) / previous_totals[row.specialty]) * 100,
                1,
            ) if previous_totals.get(row.specialty) else 0.0,
        )
        for row in rows
    ]
    if not specialties:
        return _empty_specialties()

    worst = max(specialties, key=lambda s: s.pct_over_18_weeks)
    return SpecialtiesResponse(specialties=specialties, worst_specialty=worst.name)
