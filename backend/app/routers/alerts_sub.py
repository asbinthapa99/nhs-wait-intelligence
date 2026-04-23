import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone

from ..database import Base, get_db

router = APIRouter()
log = logging.getLogger(__name__)


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False)
    region = Column(String, default="Any region")
    threshold = Column(Float, default=2.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SubscribeRequest(BaseModel):
    email: EmailStr
    region: str = "Any region"
    threshold: float = 2.0


@router.post("/alerts/subscribe")
def subscribe(body: SubscribeRequest, db: Session = Depends(get_db)):
    try:
        sub = AlertSubscription(
            email=body.email,
            region=body.region,
            threshold=body.threshold,
        )
        db.add(sub)
        db.commit()
    except Exception as exc:
        db.rollback()
        log.error("Failed to save alert subscription for %s: %s", body.email, exc)
        raise HTTPException(status_code=500, detail="Failed to save subscription. Please try again.")
    return {"ok": True}
