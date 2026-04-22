# NHS Wait Intelligence

> Open-source decision intelligence platform for NHS elective waiting list analysis, inequality mapping, and recovery tracking.

**Live:** https://nhs-wait-intelligence.vercel.app  
**Backend:** Railway (FastAPI + PostgreSQL)  
**Stack:** Next.js 14 · FastAPI · PostgreSQL · Anthropic Claude · Recharts

---

## What It Does

The NHS has 7.6 million people on waiting lists. Official data exists but is buried in spreadsheets. NHS Wait Intelligence turns that data into actionable intelligence — free, open, and built entirely on public NHS England statistics.

| Feature | What it shows |
|---|---|
| **National Overview** | Live backlog totals, wait-band breakdown, worst-performing regions |
| **Regional Inequality Map** | Interactive choropleth — inequality scores, deprivation index, trend per region |
| **Elective Recovery Tracker** | NHS 18-week and 52-week targets vs actual performance, regional progress bars |
| **Region Comparison** | Side-by-side radar + bar charts for any two NHS regions |
| **Trends & Forecasting** | Historical trend lines with 6-month ML forecasts per region |
| **Clinical Specialties** | Backlog and year-on-year growth by specialty (orthopaedics, cardiology, etc.) |
| **ICS Benchmarks** | Integrated Care System performance, sortable by inequality / backlog / trend |
| **Anomaly Alerts** | Statistical outlier detection — regions deviating significantly from expected |
| **Strategic Simulator** | Model interventions: add surgical teams, test policy scenarios, optimise resources |
| **AI Insights** | Claude-powered streaming analysis with multi-turn conversation history |

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Next.js 14 Frontend (Vercel)           │
│  14 pages · Recharts · Framer Motion    │
└────────────────┬────────────────────────┘
                 │ HTTPS / JSON
┌────────────────▼────────────────────────┐
│  FastAPI Backend (Railway)              │
│  Rate limiting · AI cache · CSV export  │
└────────────────┬────────────────────────┘
                 │ SQLAlchemy ORM
┌────────────────▼────────────────────────┐
│  PostgreSQL (Neon)                      │
│  regions · waiting_lists · forecasts    │
│  processed_metrics · ai_cache           │
└────────────────┬────────────────────────┘
                 │ Monthly ETL
┌────────────────▼────────────────────────┐
│  Python Pipeline                        │
│  NHS RTT ingestion · inequality scoring │
│  6-month forecast persistence           │
└─────────────────────────────────────────┘
```

---

## Local Development

### Requirements

- Node 20+
- Python 3.11+
- PostgreSQL 16+

### Frontend

```bash
cd frontend
npm ci
npm run dev          # http://localhost:3000
```

### Backend

```bash
cd backend
cp .env.example .env  # fill in DATABASE_URL and ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Pipeline

```bash
cd pipeline
pip install -r requirements.txt
python run_pipeline.py
```

---

## Environment Variables

### Frontend (Vercel)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |

### Backend (Railway)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon recommended) |
| `ANTHROPIC_API_KEY` | No | Falls back to local AI engine if absent |
| `PORT` | Auto | Set by Railway |

---

## Data Sources

All data is from official public NHS England and ONS sources. No patient-level data is ever used.

| File | Source |
|---|---|
| `pipeline/data/raw/rtt/*.csv` | [NHS England RTT statistics](https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/) |
| `pipeline/data/raw/ons/population_by_region.csv` | [ONS Population Estimates](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates) |
| `pipeline/data/raw/ons/imd_by_region.csv` | [English Indices of Deprivation 2019](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019) |
| `pipeline/data/raw/ons/nhs_regions.geojson` | [ONS NHS Regions Boundaries](https://www.data.gov.uk/dataset/4539d2b7-2ad5-4e06-bd1a-3a32408700ca/nhs-england-regions-january-2024-boundaries-en-bfc) |

---

## API Endpoints

```
GET  /health
GET  /api/overview
GET  /api/regions
GET  /api/regions/{id}
GET  /api/inequality
GET  /api/specialties
GET  /api/trends
GET  /api/anomalies
GET  /api/status/data
GET  /api/export/inequality.csv
GET  /api/export/specialties.csv
GET  /api/export/trends.csv
POST /api/ai-explain
POST /api/ai-stream
POST /api/simulate
POST /api/optimize-resources
POST /api/scenarios
```

---

## AI Features

When `ANTHROPIC_API_KEY` is set, all AI endpoints use Claude for streaming analysis. When unavailable, the platform falls back to a local NHS domain knowledge engine covering:

- All 7 NHS England regions with inequality and deprivation data
- 7 clinical specialty profiles with backlog and pressure ratings
- National backlog constants and RTT compliance history
- 25 intent categories including policy recommendations, regional comparisons, and trend analysis

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to `main` |
| Backend | Railway | Root directory: `backend`, Nixpacks builder |
| Database | Neon (PostgreSQL) | Serverless, connects via `DATABASE_URL` |

**Railway config** (`backend/nixpacks.toml`):
```toml
[phases.setup]
nixPkgs = ["python312", "gcc", "libpq", "postgresql"]

[start]
cmd = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

---

## Testing

```bash
# Frontend build check
cd frontend && npm run build

# Backend tests
cd backend && pytest tests/ -v

# Pipeline tests
cd pipeline && pytest tests/ -q
```

---

## Roadmap

- [ ] Live NHS RTT data pipeline (automated monthly ingestion)
- [ ] Postcode-level wait estimates
- [ ] Email alerts when your region crosses a threshold
- [ ] Trust-level (not just region-level) breakdown
- [ ] GP referral pathway guidance

---

## Contributing

Built on public NHS data, published under MIT. No advertising, no data selling, no patient data.

If you work in NHS analytics, health policy, or public health tech — contributions, issues, and feedback are very welcome.

**GitHub:** https://github.com/asbinthapa99/nhs-wait-intelligence
