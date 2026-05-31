# Letterboxd Wrapped Runbook

## Production Prerequisites
- Set `ALLOWED_ORIGINS` to exact frontend origins (comma-separated).
- Set `ANALYTICS_ADMIN_KEY` (required for `/api/metrics/summary`).
- Set `METRICS_SALT` (required for username hashing in metrics).
- If using GitHub release DB mode, set `DB_SOURCE=github_release` and required `GH_DB_*` vars.

## Health Checks
- `GET /api/db/status` should return `status: "ok"`.
- Upload a known-good ZIP and confirm `2025` (or fallback latest year) renders.
- Switch to another available year and confirm lazy load works.

## Known Failure Signatures
- `errorCode=SESSION_EXPIRED`: in-memory upload session TTL elapsed or instance restarted.
- `errorCode=NO_YEAR_DATA`: selected year has no diary entries in 2020–2025 window.
- `errorCode=POSTER_FETCH_PARTIAL`: some poster/image fetches failed; wrapped still generated.
- `errorCode=METRICS_NOT_CONFIGURED`: missing analytics env vars.

## Immediate Mitigations
- `SESSION_EXPIRED`: ask user to re-upload ZIP (expected for expired/restarted sessions).
- `NO_YEAR_DATA`: keep user on available year chips only.
- `POSTER_FETCH_PARTIAL`: user can refresh and re-upload; backend retries are bounded.
- DB failures: verify release token/asset and `/tmp` writeability, then redeploy.

## Cache and Metrics Maintenance
- Non-Vercel local cache files:
  - `cache/movies.json`
  - `cache/metrics.json`
- If cache schema drifts, app auto-repairs shape on startup.
- If manual reset is needed, delete only affected file (prefer `cache/metrics.json` first).

## Rollback
1. Re-deploy previous known-good Git commit in Vercel.
2. Confirm `GET /api/db/status` and one upload smoke test.
3. Monitor logs for 15 minutes for scraping and session errors.

## Secure Metrics Access
- Endpoint: `GET /api/metrics/summary`
- Header required: `X-Admin-Key: <ANALYTICS_ADMIN_KEY>`
- Do not expose admin key client-side.

## Day-1 Monitoring Targets
- Wrapped generation success rate.
- Poster partial warning rate (`POSTER_FETCH_PARTIAL`).
- Year switch failure rate (`SESSION_EXPIRED`, `NO_YEAR_DATA`).
- P50/P95 generation latency from logs.
