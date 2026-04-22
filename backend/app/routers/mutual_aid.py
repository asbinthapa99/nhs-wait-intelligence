from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.mutual_aid import MutualAidResponse
from ..services.mutual_aid import get_mutual_aid_pairings

router = APIRouter()

@router.get("/mutual-aid", response_model=MutualAidResponse)
def api_get_mutual_aid(
    specialty: str = Query("All", description="Filter by clinical specialty"),
    db: Session = Depends(get_db)
):
    """
    Returns AI-recommended patient transfer pairings to balance load across NHS Trusts.
    """
    return get_mutual_aid_pairings(db=db, specialty=specialty)
