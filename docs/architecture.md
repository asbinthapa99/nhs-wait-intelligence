# Architecture

## System overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  Next.js 14 (Vercel)                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Overview │ │ Map      │ │Inequality│ │ AI Chat  │  ...       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼────────────┼───────────────────┘
        │            │            │            │  HTTPS / JSON
┌───────▼────────────▼────────────▼────────────▼───────────────────┐
│  FastAPI (Railway)                                                │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ /api/overview  /api/regions  /api/inequality  /api/trends    ││
│  │ /api/specialties  /api/ai-explain                            ││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ Inequality svc  │  │ Forecasting  │  │ AI Explain svc       ││
│  │ (scoring algo)  │  │ (linear reg) │  │ (Claude + DB cache)  ││
│  └────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘│
└───────────┼─────────────────┼───────────────────────┼────────────┘
            │                 │  SQLAlchemy            │
┌───────────▼─────────────────▼───────────────────────▼────────────┐
│  PostgreSQL 17 (Neon)                                             │
│  regions · trusts · waiting_lists · processed_metrics            │
│  forecasts · ai_cache                                            │
└───────────────────────────────────────────────────────────────────┘
            ▲
            │ python run_pipeline.py (monthly cron)
┌───────────┴───────────────────────────────────────────────────────┐
│  ETL Pipeline                                                     │
│  ingest_ons.py   → seed regions with deprivation data            │
│  ingest_rtt.py   → parse NHS England RTT CSV files               │
│  inequality_score.py → compute scores + trends per region/month  │
└───────────────────────────────────────────────────────────────────┘
            ▲
┌───────────┴──────────────┐
│  Public data sources     │
│  NHS England RTT CSVs    │
│  ONS IMD 2019            │
│  CQC trust ratings       │
└──────────────────────────┘
```

## Data flow

1. **Ingestion** — `run_pipeline.py` downloads/reads raw CSV files and inserts rows into `waiting_lists`
2. **Transformation** — `inequality_score.py` aggregates by region+month, computes scores, writes to `processed_metrics`
3. **API** — FastAPI routers query `processed_metrics` (fast, pre-computed) for all dashboard endpoints
4. **AI** — `/api/ai-explain` queries `processed_metrics` to build context, calls Claude API, caches result in `ai_cache`
5. **Frontend** — Next.js pages fetch from FastAPI at build-time for static props or client-side on mount and render explicit empty/error states when live data is unavailable

## Database schema

```sql
regions            -- 7 NHS England regions, ONS deprivation + population
trusts             -- NHS provider trusts, linked to region
waiting_lists      -- raw monthly snapshots per trust/specialty
processed_metrics  -- aggregated region-level scores (query target)
forecasts          -- pre-computed 6-month linear forecasts
ai_cache           -- hashed question → AI response (24h TTL)
```

## Key design decisions

**Live-data-only contract** — dashboard endpoints return real database-backed results only. If `processed_metrics` is empty, collection endpoints return empty arrays or zeroed summaries and detail endpoints return `404`. The frontend uses `/api/status/data` plus empty states instead of substituting synthetic rows.

**Pre-computed metrics** — inequality scores are computed at ingest time and stored in `processed_metrics`. API endpoints never compute scores on the fly, keeping p99 latency under 50ms.

**Prompt caching** — the Claude system prompt is marked `cache_control: ephemeral`. On repeated questions the system prompt tokens are served from Anthropic's cache, reducing latency by ~80% and cutting cost by ~90% on the prompt tokens.

**DB-level response caching** — AI responses are stored in `ai_cache` keyed by SHA-256(question + region). Identical questions skip the Claude API entirely. TTL defaults to 24 hours.

**Rate limiting** — the `/api/ai-explain` endpoint is rate-limited to 10 req/min per IP via `slowapi` to prevent API key abuse.
