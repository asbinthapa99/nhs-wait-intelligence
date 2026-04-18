# NHS Wait Intelligence — Decision Engine

An AI-powered decision intelligence platform for reducing NHS waiting list inequalities through predictive modeling, resource optimization, and policy simulation.

The repository contains:
- `frontend/` Next.js frontend
- `backend/` FastAPI API
- `pipeline/` ETL and forecast persistence
- `.github/workflows/` CI and monthly refresh automation

## Recent Additions

- **Decision Engine**: Simulator for interventions, resource optimization, and policy scenarios.
- **Advanced Local AI**: An auto-updating Smart Logic Engine that parses intent and generates policy recommendations offline when API keys are unavailable.
- **AI Upgrades**: Interactive streaming explanations, live anomaly detection feeds, and action recommendations.
- **ICS Benchmarking**: Drill-down from national to Integrated Care System level performance metrics.
- **Governance**: Explicit data provenance, methodology metrics, and zero patient-level data tracking.
- Live data wiring for the frontend instead of mock-only page logic
- Explicit no-data states and live freshness banners across the dashboard
- Dataset status endpoint for snapshot coverage, counts, and staleness
- CSV export endpoints for inequality, specialties, and trends
- Persisted 6-month forecasts written by the pipeline and served by the API
- RTT ingestion now upserts trusts and links waiting list rows to trusts
- Optional CQC trust rating ingestion
- Optional NHS region boundary asset generation for the map
- Monthly GitHub Actions refresh workflow
- Stronger backend and pipeline tests around live-data paths
- Regions API now returns explicit empty/404 live states instead of backend mock fallbacks
- Patient-focused local feature roadmap added in `docs/patient-features.md`
- Stage 1 patient-facing page and patient guidance endpoints using live regional data
- Stage 2 provider comparison, wait-estimate, and stay-vs-switch patient tools
- Stage 3 patient support tools: preparation guide, GP conversation helper, contact routing, and data-transparency card

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend                                      │
│  Overview · Map · Inequality · Specialties · Trends · AI │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JSON / CSV
┌──────────────────────▼──────────────────────────────────┐
│  FastAPI Backend                                        │
│  Typed responses · rate limiting · AI cache · exports  │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy
┌──────────────────────▼──────────────────────────────────┐
│  PostgreSQL                                             │
│  regions · trusts · waiting_lists · processed_metrics  │
│  forecasts · ai_cache                                  │
└──────────────────────┬──────────────────────────────────┘
                       │ Monthly ETL
┌──────────────────────▼──────────────────────────────────┐
│  Python Pipeline                                        │
│  ONS seeding · RTT ingestion · CQC ratings · boundaries │
│  inequality scoring · forecast persistence              │
└─────────────────────────────────────────────────────────┘
```

## Implemented Features

### Frontend

- National overview dashboard
- Patient guidance page with regional selector, confidence labels, plain-English summaries, and NHS rights guidance
- Provider comparison, transparent wait-range estimate, and stay-vs-switch recommendation on the patient page
- Patient preparation, GP conversation helper, contact routing, and transparency guidance on the patient page
- Dataset freshness banners and empty-state handling instead of client-side mock substitution
- Regional map with region centers and optional boundary polygons
- Inequality explorer with live scatter data
- Specialty deep-dive with live YoY backlog change
- Trends page backed by stored forecasts
- AI insights page with streaming responses and multi-turn history
- CSV downloads for live datasets

## Patient-Facing Expansion

The current shipped app is still analytics-first. Patient/local-people features are now tracked in:

- `docs/patient-features.md`

That roadmap separates:

- features that can be built now from the current regional datasets
- features that need provider or postcode-level data first
- features that need saved user state and notifications
- the recommended core patient bundle: estimator, alternative finder, stay-vs-switch, alerts, and NHS guidance

### Backend

- `GET /health`
- `GET /api/overview`
- `GET /api/patient/local-summary`
- `GET /api/patient/area-compare`
- `GET /api/patient/choice-rights`
- `GET /api/patient/journey-guide`
- `GET /api/patient/preparation-guide`
- `GET /api/patient/providers`
- `POST /api/patient/gp-helper`
- `POST /api/patient/estimate`
- `POST /api/patient/contact-guide`
- `POST /api/patient/stay-switch`
- `GET /api/regions`
- `GET /api/regions/{id}`
- `GET /api/inequality`
- `GET /api/specialties`
- `GET /api/trends`
- `GET /api/status/data`
- `GET /api/export/inequality.csv`
- `GET /api/export/specialties.csv`
- `GET /api/export/trends.csv`
- `POST /api/ai-explain`
- `POST /api/ai-stream`
- `POST /api/agent-explain`

### Pipeline

- Seeds NHS regions with deprivation and population data
- Ingests RTT CSV drops
- Upserts trusts from provider data
- Optionally ingests CQC trust ratings from `pipeline/data/raw/cqc/trust_ratings.csv`
- Optionally builds region map assets from `pipeline/data/raw/ons/nhs_regions.geojson`
- Computes processed inequality metrics
- Persists 6-month forecasts to `forecasts`

## Data Inputs

Expected raw files:

- `pipeline/data/raw/rtt/*.csv` for NHS RTT data
- `pipeline/data/raw/cqc/trust_ratings.csv` for CQC ratings
- `pipeline/data/raw/ons/nhs_regions.geojson` for region boundaries
- Optional `pipeline/data/raw/ons/imd_by_region.csv`
- Optional `pipeline/data/raw/ons/population_by_region.csv`

Processed map assets are written to:

- `pipeline/data/processed/region_assets.json`

## Official Source Downloads

Use official public-source files and rename or reshape them into the filenames this repo expects.

- `pipeline/data/raw/rtt/*.csv`
  Download the monthly NHS England RTT provider-level extract from the RTT publication pages. The current publication page exposes both provider workbooks and a monthly `Full CSV data file` ZIP. Put the extracted CSV files in `pipeline/data/raw/rtt/`.
  Source: https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
  Latest monthly page example: https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/

- `pipeline/data/raw/ons/population_by_region.csv`
  Build this from the ONS population estimates time series dataset using the England region rows only. Save it as:
  `region_name,population`
  Source: https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatestimeseriesdataset/current

- `pipeline/data/raw/ons/imd_by_region.csv`
  This repo expects a derived regional file, not the raw national deprivation release. Start from the official English Indices of Deprivation 2019 release, take `File 7`, aggregate the IMD score to the 7 NHS England regions, then save:
  `region_name,deprivation_index`
  Source: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019

- `pipeline/data/raw/ons/nhs_regions.geojson`
  Download the GeoJSON from the ONS NHS England Regions boundaries dataset and save it with this exact filename.
  Source: https://www.data.gov.uk/dataset/4539d2b7-2ad5-4e06-bd1a-3a32408700ca/nhs-england-regions-january-2024-boundaries-en-bfc

- `pipeline/data/raw/cqc/trust_ratings.csv`
  You can build this from either the CQC API or the monthly `Care directory with ratings` sheet. The simplest repo-compatible shape is:
  `provider_name,cqc_rating`
  or
  `provider_code,cqc_rating`
  Source: https://www.cqc.org.uk/about-us/transparency/using-cqc-data

If you want, the next step I can do is add a small preparation script that converts the official ONS/CQC downloads into the exact `population_by_region.csv`, `imd_by_region.csv`, and `trust_ratings.csv` files this pipeline expects.

## Local Development

### Requirements

- Node 20+
- Python 3.11+
- PostgreSQL 16+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

### Pipeline

```bash
cd pipeline
pip install -r requirements.txt
python run_pipeline.py
```

## Testing

### Frontend

```bash
cd frontend
npm run build
```

### Backend

```bash
cd backend
pytest tests/ -v
```

### Pipeline

```bash
cd pipeline
pytest tests/ -q
```

## Automation & Monitoring

The platform is designed for "Zero-Touch" operation. It automatically refreshes data and only requires human intervention if an error occurs.

### GitHub Actions
- **CI Workflow (`.github/workflows/test.yml`)**: Runs tests and builds on push/PR. Includes a unified `notify-failure` job that sends an email if any check fails.
- **Monthly Refresh (`.github/workflows/refresh.yml`)**: Runs on the 1st day of each month at `06:00 UTC` (or manually via `workflow_dispatch`). Automatically scrapes NHS data and runs the ETL pipeline. Includes a failure notification step that emails logs if the pipeline crashes.

### Background Workers (Celery)
- **Celery Worker (`backend/app/worker.py`)**: Handles long-running AI queries and background tasks.
- **Global Error Handling**: Uses a global `@task_failure` signal handler to catch any crashes in background tasks and instantly email the full traceback to the administrator.

### Configuring Alerts
To enable email alerts, the following environment variables (or GitHub Secrets) must be configured:
- `SMTP_HOST`: (e.g., `smtp.gmail.com`)
- `SMTP_PORT`: (e.g., `587`)
- `SMTP_USERNAME`: (e.g., `your-email@gmail.com`)
- `SMTP_PASSWORD`: (Your SMTP password or App Password)
- `ALERT_EMAIL`: The recipient address for failure notifications

*(Note: If using Gmail, you must generate an **App Password** for the `SMTP_PASSWORD` field.)*

## Notes

- The dashboard pages now render explicit empty/live-error states instead of silently substituting mock datasets.
- The regions API includes fallback rows when metrics are unavailable and enriches them with boundary assets when present.
- **Advanced Local AI (Smart Logic Engine)**: If `ANTHROPIC_API_KEY` is not configured (or if rate limits are hit), the system automatically gracefully downgrades to a local NLP heuristic engine. This engine:
  - **Auto-Updates**: Reads directly from PostgreSQL, meaning its knowledge is instantly updated every time the monthly ETL runs without any retraining.
  - **Parses Intent**: Detects keywords (e.g., "worst", "trend", "recommendation") to tailor the factual response.
  - **Generates Policy**: Uses programmed thresholds (e.g., `inequality_score > 70` + `deteriorating trend`) to automatically formulate specific, data-backed policy recommendations.
- Forecasts are now persisted by the pipeline and preferred by the trends API when available.
- Decision-system roadmap and evidence template are documented in `docs/build-plan.md` and `docs/innovation-evidence.md`.
