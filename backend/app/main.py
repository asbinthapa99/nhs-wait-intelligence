import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .database import Base, engine
from .core.auth import generate_api_key
from .routers import overview, regions, inequality, specialties, trends, export, status, ai as ai_router, news as news_router, simulator, anomaly, patient, alerts_sub, mutual_aid
from .schemas.responses import HealthResponse
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(20))
log = structlog.get_logger()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database schema
    try:
        Base.metadata.create_all(bind=engine)
        log.info("database schema initialised")
    except Exception as exc:
        log.warning("db schema init skipped", error=str(exc))

    # Cache backend (Redis with in-memory fallback)
    try:
        redis = aioredis.from_url(settings.redis_url, encoding="utf8", decode_responses=False)
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        log.info("cache backend", backend="redis")
    except Exception as exc:
        log.warning("redis unavailable, using in-memory cache", error=str(exc))
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

    yield


app = FastAPI(
    title="NHS Wait Intelligence API",
    version="1.0.0",
    description="API for analysing NHS waiting list inequality across England.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    log.info("request", method=request.method, path=request.url.path, status=response.status_code)
    return response


app.include_router(overview.router, prefix="/api", tags=["overview"])
app.include_router(regions.router, prefix="/api", tags=["regions"])
app.include_router(inequality.router, prefix="/api", tags=["inequality"])
app.include_router(specialties.router, prefix="/api", tags=["specialties"])
app.include_router(trends.router, prefix="/api", tags=["trends"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(status.router, prefix="/api", tags=["status"])
app.include_router(patient.router, prefix="/api", tags=["patient"])
app.include_router(ai_router.router, prefix="/api", tags=["ai"])
app.include_router(news_router.router, prefix="/api", tags=["news"])
app.include_router(simulator.router, prefix="/api", tags=["simulator"])
app.include_router(anomaly.router, prefix="/api", tags=["anomaly"])
app.include_router(alerts_sub.router, prefix="/api", tags=["alerts"])
app.include_router(mutual_aid.router, prefix="/api", tags=["mutual_aid"])


@app.post("/api/keys/generate", tags=["auth"])
def generate_key():
    key = generate_api_key()
    return {"status": "success", "developer_key": key, "message": "Keep this key secure."}


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health():
    try:
        from .database import engine
        with engine.connect():
            db_status = "ok"
    except Exception:
        db_status = "error"
    return HealthResponse(status="ok", db=db_status)
