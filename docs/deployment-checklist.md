# Pre-Live Deployment Checklist

Before pushing the platform to production or heavily marketing the repository, run through this checklist to ensure stability, security, and performance.

## 1. Environment & Secrets
- [ ] `ANTHROPIC_API_KEY` is securely set in the Railway environment variables.
- [ ] `DATABASE_URL` is pointing to the Neon production instance in both Railway and GitHub Actions.
- [ ] `NEXT_PUBLIC_API_URL` is pointing to the production Railway backend domain in Vercel.
- [ ] All development debug logging is disabled (`DEBUG=False` / `FastAPI(docs_url=None)` for production).

## 2. Data & Scheduled Tasks
- [ ] ONS boundary and IMD data successfully loaded into production DB.
- [ ] At least 12 months of historical NHS RTT data loaded to allow trends/forecasting to generate correctly.
- [ ] GitHub Actions cron job is enabled (check `.github/workflows/pipeline.yml`) to automatically pull the newest monthly NHS data drops.

## 3. Infrastructure Stability
- [ ] **Rate Limiting:** IP-based rate limits active on all endpoints, particularly the AI explain paths.
- [ ] **DB Connections:** Connection pooling active (e.g., PgBouncer enabled on Neon DB) to handle multiple concurrent Next.js server-side requests.
- [ ] CORS policies on FastAPI are strictly limited to the `vercel.app` or custom domain URL.

## 4. Frontend UX
- [ ] Try generating an AI insight. Does it stream nicely or load with a clear skeleton loader?
- [ ] Try visiting the map on mobile. Is the Leaflet map responsive without breaking the page width?
- [ ] Test the Vercel analytics/performance tab (if enabled) to ensure core web vitals are green.
