# Security Reviews Log

This document serves as the ongoing log and checklist for all security reviews conducted on the NHS Waiting List Intelligence Platform. We must maintain this file regularly, particularly before major deployments or dependency updates.

## 🔒 Baseline Security Checklist

### 1. Data Privacy & Compliance
- [ ] Ensure no PHI (Protected Health Information) or PII (Personally Identifiable Information) is ever ingested or logged. (Project relies on 100% public aggregate data).
- [ ] Confirm PostgreSQL database does not inadvertently store sensitive user interactions from the AI prompts without sanitization.

### 2. Infrastructure & Deployment
- [ ] Keep `.env` and `.env.example` separate. Ensure no secrets are committed to the repository (e.g., Anthropic API keys, DB credentials).
- [ ] Verify GitHub Actions runners do not accidentally expose environment variables in logs.
- [ ] Enforce SSL/HTTPS for all frontend-to-backend and backend-to-database communications in Vercel, Railway, and Neon deployments.

### 3. Application Security (API & Frontend)
- [ ] Apply rate limiting on the FastAPI backend specifically to prevent abuse of the `/api/ai-explain` generation endpoint (preventing LLM usage cost spikes).
- [ ] Set appropriate CORS origins on the FastAPI app to only allow requests from the Vercel frontend domain.
- [ ] Avoid injection vulnerabilities (SQLi) by always utilizing SQLAlchemy ORM parameters rather than string concatenation.

### 4. Dependency Management
- [ ] Run `npm audit` routinely on the frontend.
- [ ] Run `pip-audit` or `safety` checks regularly on the backend and pipeline `requirements.txt`.

---

## 📝 Security Review Log

*Add new entries here whenever a formal review or audit is conducted.*

### Date: YYYY-MM-DD
**Reviewer:** [Name]
**Scope:** Initial architecture review
**Summary:** 
- Evaluated open endpoints and potential abuse of Claude AI API.
- Confirmed database is strictly storing public aggregate data.
**Action Items:**
- [ ] Setup rate limiting for POST `/api/ai-explain`.
- [ ] Review Neon DB network policies.

