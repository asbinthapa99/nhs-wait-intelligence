# Setup & Deployment Guide

## Local development

### Requirements
- Docker 24+
- Node 20+
- Python 3.11+

### Steps

```bash
# 1. Clone
git clone https://github.com/your-username/nhs-wait-intelligence
cd nhs-wait-intelligence

# 2. Configure
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY in backend/.env

# 3. Start stack
docker compose up

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API docs → http://localhost:8000/docs
```

### Without Docker

```bash
# Terminal 1 — PostgreSQL
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# Terminal 2 — Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your values
uvicorn app.main:app --reload

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

---

## Production deployment

### Database — Neon

The database is already provisioned on Neon (PostgreSQL 17). Schema and all 7 regions are seeded.

To provision a fresh database:
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooler connection string** from Dashboard → Connection Details
   - It looks like: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - Always use the **pooler** endpoint (contains `-pooler` in hostname) for Railway/serverless deployments
3. Set `DATABASE_URL` in `backend/.env` and as a Railway environment variable
4. Create schema (runs automatically on first backend start, or manually):
   ```bash
   cd backend && python -c "
   from app.database import Base, engine
   import app.models
   Base.metadata.create_all(bind=engine)
   print('Schema created')
   "
   ```
5. Seed regions:
   ```bash
   cd pipeline && python ingest_ons.py
   ```

### Backend — Railway

1. Push to GitHub
2. Create new Railway project → Deploy from GitHub → select `backend/` as root
3. Set environment variables:
   ```
   DATABASE_URL=postgresql://...  (from Supabase)
   ANTHROPIC_API_KEY=sk-ant-...
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
4. Railway detects the Dockerfile automatically

### Frontend — Vercel

1. Import GitHub repository at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   ```
4. Deploy

### Monthly data refresh (GitHub Actions cron)

Add this workflow to `.github/workflows/refresh.yml` once the pipeline is configured:

```yaml
on:
  schedule:
    - cron: "0 6 1 * *"   # 6am UTC on the 1st of each month

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r pipeline/requirements.txt
      - run: python pipeline/run_pipeline.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Environment variables reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/nhs_intelligence` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | — | Claude API key. AI endpoint returns fallback text if unset |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Comma-separated CORS origins |
| `AI_RATE_LIMIT` | No | `10/minute` | slowapi rate limit string |
| `CACHE_TTL_HOURS` | No | `24` | Hours to cache AI responses in DB |
| `LOG_LEVEL` | No | `INFO` | Python log level |

### Frontend (`.env.local` or Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API base URL |
