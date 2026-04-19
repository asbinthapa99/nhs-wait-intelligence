from sqlalchemy import String, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from ..database import Base


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    region_code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    deprivation_index: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    boundary = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)

    waiting_lists: Mapped[list["WaitingList"]] = relationship(back_populates="region")
    metrics: Mapped[list["ProcessedMetric"]] = relationship(back_populates="region")
    forecasts: Mapped[list["Forecast"]] = relationship(back_populates="region")
