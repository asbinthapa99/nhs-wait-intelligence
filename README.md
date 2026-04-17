# NHS Waiting List Intelligence Platform

An AI-powered full-stack platform that analyses NHS waiting list inequality across England using 100% public data.

[![CI](https://github.com/your-username/nhs-wait-intelligence/actions/workflows/test.yml/badge.svg)](https://github.com/your-username/nhs-wait-intelligence/actions)

---

## What it does

Turns raw NHS England RTT (Referral to Treatment) data into an explorable dashboard with AI-assisted explanations, inequality scoring, and 6-month forecasting.

**Key findings surfaced by the platform:**
- 7.62 million patients currently on the NHS waiting list
- 38.4% waiting beyond the 18-week constitutional standard
- North East & Yorkshire waits **2.4× longer** than the South West for orthopaedic surgery
- Deprivation explains ~91% of regional inequality variance (r ≈ 0.91)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js frontend (Vercel)                              │
│  6 dashboard pages · Recharts · Leaflet · Tailwind CSS  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────────┐
│  FastAPI backend (Railway)                              │
│  7 endpoints · Rate limiting · Structured logging       │
│  Claude claude-sonnet-4-6 AI layer with prompt caching         │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy
┌──────────────────────▼──────────────────────────────────┐
│  PostgreSQL 17 (Neon)                                   │
│  6 tables · Monthly ETL pipeline · Processed metrics    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Data pipeline (GitHub Actions cron)                    │
│  NHS RTT CSVs · ONS IMD · Inequality scoring            │
└─────────────────────────────────────────────────────────┘
```

---

## Dashboard pages

| Page | Route | Description |
|------|-------|-------------|
| National overview | `/` | KPI cards, backlog trend chart, worst regions |
| Regional map | `/map` | Leaflet choropleth, region drill-down |
| Inequality explorer | `/inequality` | Scatter plot (deprivation vs score), CSV export |
| Specialty deep-dive | `/specialties` | Bar charts by specialty, YoY growth table |
| Trends & forecasting | `/trends` | Multi-line comparison, 6-month linear forecast |
| AI insights | `/ai` | Claude-powered Q&A grounded in live data |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, Leaflet |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| AI | Claude claude-sonnet-4-6 (Anthropic), prompt caching, DB response cache |
| Pipeline | pandas, SQLAlchemy |
| CI/CD | GitHub Actions |
| Hosting | Vercel (frontend), Railway (backend), Neon (database) |

---

## Quick start (local)

### Prerequisites
- Docker & Docker Compose
- Node 20+
- Python 3.11+

### 1. Clone and configure

```bash
git clone https://github.com/your-username/nhs-wait-intelligence.git
cd nhs-wait-intelligence

cp backend/.env.example backend/.env
# Edit backend/.env — add your ANTHROPIC_API_KEY
```

### 2. Start with Docker Compose

```bash
docker compose up
```

This starts:
- PostgreSQL on `localhost:5432`
- FastAPI on `http://localhost:8000`
- Next.js on `http://localhost:3000`

The API serves mock data until the pipeline loads real data.

### 3. (Optional) Load real NHS data

Download NHS England RTT monthly CSVs from:
https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/

Place the CSV files in `pipeline/data/raw/rtt/` then run:

```bash
cd pipeline
pip install -r requirements.txt
python run_pipeline.py
```

---

## Running tests

```bash
# Backend
cd backend
pip install -r requirements.txt
pytest tests/ -v

# Frontend (type check + build)
cd frontend
npm ci
npx tsc --noEmit
npm run build
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/overview` | National KPIs + trend + worst regions |
| GET | `/api/regions` | All 7 NHSE regions with inequality scores |
| GET | `/api/regions/{id}` | Single region detail |
| GET | `/api/inequality` | Scatter data + gap ratio |
| GET | `/api/specialties` | Per-specialty breakdown |
| GET | `/api/trends?regions=` | Historical + 6-month forecast |
| POST | `/api/ai-explain` | AI question answering |

Interactive docs: `http://localhost:8000/docs`

---

## Inequality score methodology

```
Score = (% over 18 weeks × 0.40) + (backlog growth rate × 0.35) + (deprivation index × 0.25)
```

Normalised 0–100. Higher = worse. Full methodology: [docs/inequality-methodology.md](docs/inequality-methodology.md)

---

## Data sources

| Dataset | Source | Frequency |
|---------|--------|-----------|
| RTT waiting times | NHS England | Monthly |
| Index of Multiple Deprivation | ONS | Annual |
| NHS region boundaries | ONS Geography Portal | Occasional |
| Trust CQC ratings | Care Quality Commission | Quarterly |

All data is publicly available at no cost. No patient-level data is used.

---

## Deployment

See [docs/setup.md](docs/setup.md) for full deployment instructions for Vercel, Railway, and Neon.

---

## Project structure

```
nhs-wait-intelligence/
├── frontend/          Next.js dashboard
│   ├── pages/         6 route pages
│   ├── components/    Reusable UI components
│   └── lib/api.ts     API client + TypeScript types
├── backend/           FastAPI application
│   ├── app/
│   │   ├── models/    SQLAlchemy models (6 tables)
│   │   ├── schemas/   Pydantic response schemas
│   │   ├── routers/   Endpoint handlers (6 routers)
│   │   └── services/  Business logic (inequality, forecasting, AI)
│   └── tests/         pytest integration tests
├── pipeline/          ETL scripts
│   ├── ingest_rtt.py  NHS RTT ingestion
│   ├── ingest_ons.py  ONS deprivation seed
│   ├── inequality_score.py  Metric computation
│   └── run_pipeline.py      Master runner
├── docs/              Architecture and API documentation
├── docker-compose.yml Local development stack
└── .github/workflows/ CI (test + build on every push)
```

---

## Licence

MIT
