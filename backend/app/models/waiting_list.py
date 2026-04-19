from datetime import date
from sqlalchemy import String, Integer, Float, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class WaitingList(Base):
    __tablename__ = "waiting_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_id: Mapped[int] = mapped_column(Integer, ForeignKey("regions.id"), nullable=False)
    trust_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("trusts.id"), nullable=True)
    specialty: Mapped[str] = mapped_column(String(200), nullable=False)
    snapshot_month: Mapped[date] = mapped_column(Date, nullable=False)
    total_waiting: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    waiting_under_18_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    waiting_over_18_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    waiting_over_52_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pct_over_18_weeks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    region: Mapped["Region"] = relationship(back_populates="waiting_lists")
    trust: Mapped["Trust | None"] = relationship(back_populates="waiting_lists")
