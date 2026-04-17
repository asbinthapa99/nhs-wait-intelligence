# API Reference

Base URL: `http://localhost:8000` (local) | `https://your-app.railway.app` (production)

Interactive docs: `{base_url}/docs`

---

## GET /health

Returns API and database status.

**Response**
```json
{
  "status": "ok",
  "db": "ok",
  "version": "1.0.0"
}
```

---

## GET /api/overview

National KPIs, monthly trend, and worst-performing regions.

**Response**
```json
{
  "total_waiting": 7620000,
  "pct_over_18_weeks": 38.4,
  "regional_gap": 2.4,
  "improving_regions": 3,
  "total_regions": 7,
  "monthly_trend": [
    { "month": "Apr 22", "value": 6.1 }
  ],
  "worst_regions": [
    { "name": "North East & Yorkshire", "score": 87, "trend": "deteriorating" }
  ],
  "ai_summary": "..."
}
```

---

## GET /api/regions

All 7 NHS England regions with latest inequality scores.

**Response** — array of:
```json
{
  "id": 1,
  "name": "North East & Yorkshire",
  "region_code": "Y63",
  "inequality_score": 87.0,
  "backlog_rate_per_100k": 142.0,
  "deprivation_index": 0.78,
  "trend": "deteriorating",
  "total_waiting": 1240000,
  "pct_over_18_weeks": 87.0
}
```

---

## GET /api/regions/{id}

Single region by ID. Returns 404 if not found.

---

## GET /api/inequality

Scatter plot data and gap ratio.

**Response**
```json
{
  "regions": [
    { "name": "North East & Yorkshire", "score": 87, "deprivation_index": 0.78, "backlog_rate": 142 }
  ],
  "gap_ratio": 2.8,
  "best_region": "South West",
  "worst_region": "North East & Yorkshire"
}
```

---

## GET /api/specialties

Waiting times broken down by medical specialty.

**Response**
```json
{
  "specialties": [
    { "name": "Orthopaedics", "total_waiting": 680000, "pct_over_18_weeks": 52.0, "yoy_change": 18.4 }
  ],
  "worst_specialty": "Orthopaedics"
}
```

---

## GET /api/trends

Historical trend series and 6-month linear forecast.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `regions` | string | Comma-separated region names to include. Defaults to all. |

**Response**
```json
{
  "regions": ["North East & Yorkshire", "South West"],
  "series": [
    {
      "region": "North East & Yorkshire",
      "data": [{ "month": "Jan 22", "value": 5.8 }]
    }
  ],
  "forecast": [
    {
      "region": "North East & Yorkshire",
      "data": [{ "month": "Jan 25", "predicted": 8.5, "lower": 8.1, "upper": 8.9 }]
    }
  ]
}
```

---

## POST /api/ai-explain

Ask a plain-English question about NHS waiting list data.

Rate limited: **10 requests/minute per IP**.

**Request body**
```json
{
  "question": "Why is the North East performing so much worse than the South West?",
  "region": "North East & Yorkshire"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Max 500 characters |
| `region` | string | No | Focus context on a specific region |

**Response**
```json
{
  "region": "North East & Yorkshire",
  "question": "Why is the North East performing worse?",
  "response": "Based on current data, the North East...",
  "data_context": {
    "inequality_score": 87.0,
    "pct_over_18_weeks": 87.0,
    "deprivation_index": 0.78,
    "trend": "deteriorating"
  },
  "cached": false
}
```

**Notes:**
- Responses are cached in PostgreSQL for 24 hours (configurable via `CACHE_TTL_HOURS`)
- `cached: true` means the response was served from DB cache — no Claude API call was made
- If `ANTHROPIC_API_KEY` is not set, returns a factual fallback response
- Uses prompt caching (`cache_control: ephemeral`) to reduce latency on repeated system prompt tokens

---

## Error responses

All errors follow this format:

```json
{ "detail": "Error message" }
```

| Status | Meaning |
|--------|---------|
| 422 | Validation error (empty question, question too long) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
