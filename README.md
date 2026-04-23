# NHS Wait Intelligence

> Open-source decision intelligence platform for NHS elective waiting list analysis, inequality mapping, and recovery tracking.

**Live:** https://nhs-wait-intelligence.vercel.app  
**Backend:** Railway (FastAPI + PostgreSQL)  
**Stack:** Next.js 14 · FastAPI · PostgreSQL · Recharts · Claude AI

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
| **Autonomous SQL Agent** | LangChain Text-to-SQL agent — ask ad-hoc data questions in plain English |
| **Patient Pathway Guide** | Wait estimates, provider comparison, GP letter drafts, and stay/switch advice |
| **NHS News Feed** | AI-triaged RSS headlines from NHS England, BBC Health, and The Guardian |

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Next.js 14 Frontend (Vercel)           │
│  33 pages · Recharts · Framer Motion    │
└────────────────┬────────────────────────┘
                 │ HTTPS / JSON
┌────────────────▼────────────────────────┐
│  FastAPI Backend (Railway)              │
│  13 routers · Rate limiting · AI cache  │
│  LangChain SQL agent · CSV export       │
└────────────────┬────────────────────────┘
                 │ SQLAlchemy ORM
┌────────────────▼────────────────────────┐
│  PostgreSQL (Neon)                      │
│  regions · trusts · waiting_lists       │
│  processed_metrics · forecasts          │
│  ai_cache                               │
└────────────────┬────────────────────────┘
                 │ Monthly ETL
┌────────────────▼────────────────────────┐
│  Python Pipeline                        │
│  NHS RTT ingestion · ONS seeding        │
│  CQC ratings · inequality scoring       │
│  6-month ML forecasting                 │
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
| `ANTHROPIC_API_KEY` | No | Powers Claude AI + SQL agent; falls back to local engine if absent |
| `GEMINI_API_KEY` | No | Gemini Flash — first in AI provider cascade |
| `GROQ_API_KEY` | No | Groq Llama — second in AI provider cascade |
| `OPENROUTER_API_KEY` | No | OpenRouter Mistral — third in AI provider cascade |
| `PORT` | Auto | Set by Railway |

### Optional (enhanced features)

| Variable | Notes |
|---|---|
| `REDIS_URL` | Enables Redis-backed caching; falls back to in-memory without it |
| `SMTP_HOST` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Pipeline failure email alerts |

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

## API Reference

### Core Analytics

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
GET  /api/status/rtt-archive
```

### Export

```
GET  /api/export/inequality.csv
GET  /api/export/specialties.csv
GET  /api/export/trends.csv
```

### AI

```
POST /api/ai-explain          # Cached, multi-turn chat
POST /api/ai-stream           # Server-Sent Events streaming
GET  /api/ai-briefing         # Executive briefing (24 h cache)
GET  /api/ai-insights         # 3 proactive insight bullets
POST /api/agent-explain       # LangChain autonomous SQL agent
```

### Patient Pathway

```
GET  /api/patient/choice-rights
GET  /api/patient/journey-guide
GET  /api/patient/preparation-guide
GET  /api/patient/local-summary?region=London
GET  /api/patient/area-compare?region=London
GET  /api/patient/providers?region=London&specialty=Cardiology
POST /api/patient/estimate
POST /api/patient/stay-switch
POST /api/patient/gp-helper
POST /api/patient/contact-guide
```

### Simulation

```
POST /api/simulate
POST /api/optimize-resources
POST /api/scenarios
```

---

## AI Features

### Provider Cascade

When `ANTHROPIC_API_KEY` is set, AI endpoints use Claude for streaming analysis. The platform cascades through providers in order:

1. **Gemini 2.5 Flash** (fastest)
2. **Groq Llama 3.1** (low latency)
3. **OpenRouter Mistral** (fallback)
4. **Claude (Anthropic)** (highest quality)
5. **Local NHS knowledge engine** (always available, no key required)

### Autonomous SQL Agent

The `/api/agent-explain` endpoint uses a LangChain Text-to-SQL agent backed by Claude Haiku. It autonomously queries the PostgreSQL database to answer ad-hoc questions in plain English:

> *"Which region has the highest percentage over 52 weeks this month?"*  
> *"How many trusts are in the Midlands with over 10,000 patients waiting?"*

Requires `ANTHROPIC_API_KEY` and `langchain-community` + `langchain-anthropic` (both in `requirements.txt`).

### Privacy

All questions passed to the SQL agent are scrubbed through a PII protection layer. Install `presidio-analyzer` and `presidio-anonymizer` to enable full Microsoft Presidio PII redaction in production. Without these packages the platform logs a warning and continues without redaction.

---

## Testing

```bash
# Frontend build check
cd frontend && npm run build

# Backend tests (45 tests)
cd backend && pytest tests/ -v

# Pipeline tests
cd pipeline && pytest tests/ -q
```

Test coverage includes:
- All core API endpoints (overview, regions, inequality, specialties, trends)
- Patient pathway endpoints (choice rights, journey guide, estimates, stay/switch)
- AI endpoints (explain, stream, briefing, insights, agent)
- News service (RSS parsing, malformed feeds)
- Services (inequality scoring, linear forecasting)
- Empty and live-data states

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

## Roadmap

- [ ] Automated monthly RTT data pipeline (GitHub Actions)
- [ ] Postcode-level wait estimates
- [ ] Email alerts when your region crosses a threshold
- [ ] Trust-level (not just region-level) breakdown on the map
- [ ] GP referral pathway guidance with local provider lookup

---

## Why This Project Matters

NHS Wait Intelligence addresses a high-impact national problem: long elective waiting times and unequal access across regions. The platform turns complex public datasets into practical decision support for service planning, policy analysis, and recovery monitoring.

Designed to be:

- **Public-interest focused** — built on official open data, no patient-level data
- **Operationally useful** — dashboards and exports support real planning workflows
- **Transparent** — methods and sources are visible, reproducible, and auditable
- **Scalable** — cloud deployment with continuous delivery and iterative improvement

---

## Contributing

Built on public NHS data, published under MIT. No advertising, no data selling, no patient data.

If you work in NHS analytics, health policy, or public health tech — contributions, issues, and feedback are very welcome.

**GitHub:** https://github.com/asbinthapa99/nhs-wait-intelligence
