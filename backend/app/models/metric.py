from datetime import date
from sqlalchemy import Integer, Float, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class ProcessedMetric(Base):
    __tablename__ = "processed_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_id: Mapped[int] = mapped_column(Integer, ForeignKey("regions.id"), nullable=False)
    snapshot_month: Mapped[date] = mapped_column(Date, nullable=False)
    inequality_score: Mapped[float] = mapped_column(Float, nullable=False)
    backlog_rate_per_100k: Mapped[float] = mapped_column(Float, nullable=False)
    backlog_growth_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_waiting: Mapped[int] = mapped_column(Integer, nullable=False)
    pct_over_18_weeks: Mapped[float] = mapped_column(Float, nullable=False)
    trend: Mapped[str] = mapped_column(String(20), nullable=False, default="stable")

    region: Mapped["Region"] = relationship(back_populates="metrics")
