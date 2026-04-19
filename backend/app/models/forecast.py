from datetime import date
from sqlalchemy import Integer, Float, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_id: Mapped[int] = mapped_column(Integer, ForeignKey("regions.id"), nullable=False)
    forecast_month: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_waiting: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Float, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Float, nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False, default="linear_regression")
    generated_at: Mapped[date] = mapped_column(Date, nullable=False)

    region: Mapped["Region"] = relationship(back_populates="forecasts")
