from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from ..database import get_db
from ..services.news import get_news
from ..config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/news")
@limiter.limit("30/minute")
async def news_feed(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Returns AI-triaged NHS and health news headlines, cached for 1 hour."""
    articles, cached = await get_news(db)
    return {"articles": articles, "cached": cached, "count": len(articles)}
