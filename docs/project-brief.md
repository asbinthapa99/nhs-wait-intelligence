# Project Brief

## Product

Build a full-stack web platform that analyses NHS waiting list inequality across England using public data.

## Core Goal

Turn raw NHS and related public datasets into an explorable dashboard with AI-assisted explanations, downloadable data, and clear inequality indicators.

## Proposed Architecture

- Frontend: React + Next.js dashboard
- Backend API: Python FastAPI
- Database: PostgreSQL, with Supabase acceptable for hosting
- Data pipeline: ingestion, cleaning, validation, transformation, inequality scoring
- AI layer: LLM-powered explanation endpoints with cached responses

## Public Data Sources Mentioned

- NHS England RTT CSV data
- ONS deprivation data
- CQC ratings
- ONS GeoJSON boundaries

## Key Functional Areas

- National overview dashboard
- Regional inequality map
- Inequality explorer
- Specialty deep-dive
- Trends and forecasting
- AI insights / question answering
- CSV export
- Automated monthly data refresh

## Dashboard Pages From Brief

1. National overview with KPI cards and charts
2. Regional map with choropleth visualisation
3. Inequality explorer with comparisons and scatter plot style analysis
4. Specialty deep-dive
5. Trends and forecasting
6. AI insights page with user question input

## Suggested Tech Stack From Brief

### Frontend

- React + Next.js
- Tailwind CSS
- Recharts
- Leaflet.js
- Axios

### Backend / Data / AI

- Python 3.11
- FastAPI
- spaCy
- LLM API for plain-English insights
- DB-backed response caching

### Storage / Deployment

- PostgreSQL
- Supabase
- Vercel
- Railway
- GitHub Actions

## Initial Database Tables Mentioned

- `waiting_lists`
- `regions`
- `trusts`
- `metrics`
- `forecasts`
- `ai_cache`

## Delivery Priorities

- Clean ETL pipeline for public health datasets
- Reliable backend API over processed metrics
- Interactive dashboards first
- AI explanation layer after core metrics are trustworthy
- CI/CD and monthly scheduled refresh before launch

## Notes

- The PDF includes visa/outreach strategy. That is not part of the product build itself, so it is intentionally not treated as implementation scope unless you ask for it.
