# Contributing to NHS Wait Intelligence

Thank you for your interest in helping improve NHS waiting list transparency!

## Getting Started
1. Fork the repository.
2. Install dependencies for both frontend and backend.
3. Ensure you have a local PostgreSQL instance or a Neon.tech connection string.

## Tech Stack
- **Frontend:** Next.js 14, Tailwind CSS, Recharts
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **AI:** Claude 3.5 Sonnet (Anthropic API)

## Development Workflow
- Create a feature branch: `git checkout -b feat/your-feature-name`
- Ensure Python code follows Black/Ruff formatting.
- Ensure TypeScript code passes `npm run lint`.

## Data Privacy
**Strict Rule:** Do not commit any patient-identifiable data. This project uses 100% public, aggregated NHS England data. If you find a way to ingest PII, stop and report it via a Security Issue immediately.

## License
By contributing, you agree that your contributions will be licensed under the MIT License.