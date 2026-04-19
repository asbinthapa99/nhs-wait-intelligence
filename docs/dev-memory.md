# Development Memory

This file is the working memory for implementation. I will update it as the project evolves.

## Current Understanding

- Repo started empty on 2026-04-11.
- Product direction comes from `/Users/user/Downloads/NHS_Intelligence_Platform.pdf`.
- The build should focus on production-quality engineering, not a visa-specific presentation layer.

## Working Scope

- Frontend analytics dashboard
- Backend API
- PostgreSQL database
- ETL/data ingestion pipeline
- AI explanation layer
- Deployment and CI/CD

## Build Decisions Saved

- Prefer `Next.js` for the frontend.
- Prefer `FastAPI` for backend services and data endpoints.
- Prefer `PostgreSQL` as the source-of-truth database.
- Use public-source ingestion only.
- Keep AI responses grounded in stored metrics and cache generated explanations.
- Build the 6 analytics pages before extra polish work.

## Proposed App Areas

- `frontend/`: Next.js app
- `backend/`: FastAPI app and services
- `pipeline/`: ingestion and transformation jobs
- `docs/`: project documentation and architecture notes

## Target Data Entities

- Region
- Trust
- Waiting list snapshot
- Specialty metric
- Trend / forecast output
- AI cached answer
- Data source ingest run

## Immediate Next Steps

1. Scaffold frontend, backend, and docs structure.
2. Define database schema and migration strategy.
3. Create initial ETL pipeline contract for NHS/ONS/CQC sources.
4. Build backend endpoints for overview, map, trends, specialties, and AI insights.
5. Build dashboard pages against those endpoints.

## Update Rule

When architecture, schema, routes, or deployment decisions change, update this file first so future development stays consistent.
