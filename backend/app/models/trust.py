from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Trust(Base):
    __tablename__ = "trusts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    trust_code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    region_id: Mapped[int] = mapped_column(Integer, ForeignKey("regions.id"), nullable=False)
    cqc_rating: Mapped[str | None] = mapped_column(String(50), nullable=True)

    region: Mapped["Region"] = relationship()
    waiting_lists: Mapped[list["WaitingList"]] = relationship(back_populates="trust")
