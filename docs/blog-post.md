# I Built an Open-Source NHS Waiting List Intelligence Platform — Here's How

The NHS waiting list hit 7.6 million in 2024. If you wanted to understand *why*, or *where*, or *which specialties are worst* — you'd have to download a 50MB spreadsheet from a government website, open it in Excel, and figure it out yourself.

I built something better.

---

## The Problem

NHS England publishes Referral to Treatment (RTT) data every month. It's detailed, it's public, it's free — and it's completely inaccessible to most people. The data lives in provider-level CSV files, one per month, with cryptic column names and no national summary.

There's no interactive map. No trend analysis. No comparison between regions. No answer to the question: *"Is the North East actually getting worse, or does it just have a larger population?"*

That's what NHS Wait Intelligence is.

---

## What I Built

A full-stack web application that ingests official NHS RTT data, computes inequality-adjusted metrics, runs 6-month forecasts, and presents everything in a clean dark-mode dashboard — with AI-powered analysis on top.

**Live:** https://nhs-wait-intelligence.vercel.app  
**GitHub:** https://github.com/asbinthapa99/nhs-wait-intelligence

### 10 Tools in One Platform

The features I'm most proud of are the ones the NHS *doesn't* publish:

**Elective Recovery Tracker** — measures the NHS against its own constitutional standard (92% of patients treated within 18 weeks). This standard hasn't been met nationally since 2016. I show exactly how far off we are, region by region, with a progress bar against the target.

**Region Comparison** — pick any two NHS regions and compare them head-to-head: waiting times, inequality scores, deprivation index, backlog rate. Rendered as a radar chart and a KPI table with the better value highlighted.

**Anomaly Alerts** — statistical z-score detection that flags regions or specialties deviating significantly from expected performance. Grouped by severity (critical / high / medium / low).

**Strategic Simulator** — model what happens if you add surgical teams, shift budgets, or apply a policy intervention. Not just a calculator — it uses the actual backlog data to project realistic outcomes.

---

## The Stack

### Frontend — Next.js 14 + TypeScript

The frontend is a Next.js 14 app deployed on Vercel. I used:

- **Recharts** for all the data visualisation (line charts, radar charts, radial gauge charts, bar charts)
- **Framer Motion** for page animations and transitions
- **Tailwind CSS** with a custom dark-mode design system using glassmorphism (`backdrop-blur`, `bg-opacity`, border glow effects)
- **Leaflet** (via `react-leaflet`) for the interactive regional inequality map

One design decision I'm proud of: every page has a proper empty state. When the backend is unreachable or data hasn't been loaded, users see a clear "no data" card — not a broken chart or a loading spinner that never resolves.

### Backend — FastAPI + Python

The API is a FastAPI application deployed on Railway. Key design choices:

- **SQLAlchemy 2.0** with async support for all database queries
- **Pydantic v2** for strict response validation — every endpoint has a typed response model
- **Rate limiting** via `slowapi` to prevent abuse
- **AI response caching** — Claude API responses are cached in PostgreSQL with a TTL, so repeated questions don't incur API costs
- **CSV export endpoints** — every dataset is downloadable as a spreadsheet

### Database — PostgreSQL on Neon

I used [Neon](https://neon.tech) for a serverless PostgreSQL instance. The schema has five core tables:

```sql
regions               -- 7 NHS England regions with deprivation + inequality scores
waiting_lists         -- monthly RTT snapshots per region
processed_metrics     -- pre-computed inequality scores and backlog rates
forecasts             -- 6-month ahead predictions (written by the pipeline)
ai_cache              -- cached Claude responses keyed by question hash
```

### Pipeline — Python ETL

The data pipeline runs on a monthly schedule and does four things:

1. **Ingest** NHS RTT CSV files into the `waiting_lists` table
2. **Score** each region using an inequality formula that weights deprivation and backlog rate
3. **Forecast** using linear regression to project 6 months ahead
4. **Persist** the forecasts so the API can serve them instantly

The inequality score formula isn't just raw waiting times — it's:

```
inequality_score = backlog_rate_per_100k × deprivation_index × 100
```

This means a region with a high backlog *and* high deprivation scores worse than a wealthy region with the same raw waiting numbers. That's the point: equal access to healthcare should account for who has fewer alternatives.

### AI — Anthropic Claude

The AI Insights panel uses Claude (claude-sonnet-4-6) with streaming responses. I pass the live database context (current region data, national averages, trend direction) into the system prompt so Claude can answer questions grounded in real numbers.

When the API key isn't available, I fall back to a local NHS domain knowledge engine — a hand-coded intent classifier covering 25 question types with embedded NHS statistics. It's not as good as Claude, but it means the AI page always works.

---

## Mobile-First Design

The app was originally desktop-first. I rebuilt the navigation from scratch for mobile:

The bottom nav now has a **More** drawer — a slide-up sheet that groups all 10 tools into three sections (Analytics, Tools, Info) with descriptions. Before this, the "More" tab just linked to the governance page. On a phone with a 390px screen, that meant 8 tools were completely hidden.

Every chart now has responsive heights. The map is `h-[300px]` on mobile and `h-[500px]` on desktop. ICS KPI cards use `text-2xl sm:text-3xl` so they don't overflow on 320px screens.

---

## The Hard Parts

**Railway port binding.** Railway assigns a random `$PORT` — if you hardcode `8000` in your Dockerfile, every deploy fails with a 502. The fix is `CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.

**Dependency conflicts.** `langchain-anthropic==0.1.23` requires `anthropic>=0.30.0`, but I had `anthropic==0.28.0`. And `langchain-core>=0.2.32` requires `pydantic>=2.7.4`. Getting all three to resolve took more time than I'd like to admit.

**GeoAlchemy2 and pgvector** — I stripped "heavy" dependencies to get under Vercel's 250MB limit, but the SQLAlchemy models imported these at startup. The backend crashed on every cold start until I added them back.

**CORS.** The frontend on Vercel was calling `localhost:8000` in production because `NEXT_PUBLIC_API_URL` wasn't set. Classic. The env var has to be set *in Vercel's dashboard*, not just in `.env.local`.

---

## What's Next

- **Live data pipeline** — automated monthly NHS RTT ingestion via GitHub Actions
- **Postcode-level estimates** — "how long is the wait in your area?"
- **Trust-level breakdown** — currently the data is regional; going to Trust level needs a different ETL approach
- **Email alerts** — subscribe to get notified when your region crosses a threshold

---

## Why Open Source

NHS data is public. The tools to understand it should be too.

If you're an NHS analyst, a health policy researcher, a journalist, or just someone who waited 14 months for an MRI and wanted to know why — this is for you.

**Star the repo, raise an issue, or contribute:** https://github.com/asbinthapa99/nhs-wait-intelligence

---

*Built with Next.js, FastAPI, PostgreSQL, and Anthropic Claude. Deployed on Vercel + Railway. All data from NHS England and ONS — no patient records, ever.*
