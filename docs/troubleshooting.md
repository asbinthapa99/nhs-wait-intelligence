# Troubleshooting Guide

This guide covers the most common issues you might encounter while developing, running, or deploying the NHS Waiting List Intelligence Platform.

## 1. Database Connection Errors

**Symptom:** Backend fails to start with `psycopg2.OperationalError` or `sqlalchemy.exc.OperationalError`.
**Solutions:**
- **Local:** Ensure Docker Compose is actively running. Run `docker ps` to verify the `postgres` container is up.
- **Production (Neon):** Check that your Neon DB is not paused due to inactivity (if on a free tier). Verify the connection string in the `backend/.env` is correct.

## 2. API Data Returning Empty / 404

**Symptom:** The dashboard loads, but all charts are empty, or the overview endpoint returns no data.
**Solutions:**
- **Pipeline:** Have you run the ETL pipeline? The database starts empty. You must seed the base data.
  - Run `cd pipeline && python ingest_ons.py` followed by `python ingest_rtt.py`.
- **Data status check:** Call `/api/status/data` to confirm whether processed metrics, waiting list rows, and forecasts are present, and whether a refresh is recommended.
- **Verify raw files:** Confirm the expected CSV and GeoJSON files exist under `pipeline/data/raw/` before running the pipeline. The API now exposes empty live-state responses instead of mock rows when the database has not been loaded.

## 3. Claude AI Responses Taking Too Long / Timing Out

**Symptom:** `/api/ai-explain` returns a `504 Gateway Timeout` or takes > 10 seconds.
**Solutions:**
- **Prompt Caching:** Ensure the Anthropic prompt caching headers are correctly set in the FastAPI service file.
- **System DB Cache:** Verify the PostgreSQL `AI Cache` table is functioning. Identical queries should hit the local database instead of the Anthropic API.
- **Vercel Limits:** If deployed to Vercel, free tier serverless functions timeout at 10 seconds. Ensure AI requests are streamed (`text/event-stream`) or utilize background workers if processing requires heavy context building.

## 4. Frontend Build Failures

**Symptom:** `Next.js` fails to build on Vercel or locally with `TypeScript` errors.
**Solutions:**
- Run `npx tsc --noEmit` locally to catch type errors.
- Ensure the FastAPI schema types in `backend/app/schemas/` are properly mirrored in `frontend/lib/api.ts`. Any missing fields will cause strict type-checking failures in Recharts maps.

## 5. Next.js Hydration Errors

**Symptom:** React logs "Text content did not match. Server: X Client: Y".
**Solutions:**
- This typically happens around dates and times (e.g. rendering `new Date()`). Ensure all dates are rendered consistently via hydration-safe formatters or use a lightweight state to render them post-mount.
