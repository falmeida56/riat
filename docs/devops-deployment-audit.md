# RIAT DevOps And Deployment Audit

Date: 2026-06-22

## Current State

- The repository now has environment-driven Django settings for secrets, debug mode, allowed hosts, CORS, database credentials, and LLM configuration.
- Django production security settings are environment-driven: HTTPS redirect, secure cookies, HSTS, forwarded-proto handling, frame policy, referrer policy, and content-type nosniff.
- JWT lifetimes, email delivery, OpenAI timeout, and password-reset frontend URL are environment-driven.
- Frontend API targeting is controlled through `VITE_API_URL`; see `frontend/.env.example`.
- `frontend/dist/` is generated build output and should be produced by CI/deployment, not committed as source.
- `scripts/predeploy-check.sh` provides a local non-deploying validation gate for repository whitespace, backend package integrity, Django checks, backend tests, frontend audit, frontend lint, and frontend production build.
- `scripts/predeploy-check.sh` also fails if generated `frontend/dist/` files are tracked as source.
- `scripts/production-config-check.sh` validates the production environment shape without printing secrets and runs Django `check --deploy`.
- `scripts/live-runtime-inventory.sh` provides a read-only VM inventory helper for OS/runtime/service/disk/git/health checks without printing secret values.
- `scripts/smoke-check.sh` provides read-only URL smoke checks for the frontend, privacy-policy asset, and API health endpoint.
- `GET /api/health/` provides a public non-sensitive API health endpoint for load balancer and smoke-test checks.
- `.github/workflows/ci.yml` now defines backend and frontend CI jobs for push, pull request, and manual runs; the frontend job uploads `frontend/dist` as a build artifact after confirming it is not tracked source.
- No production VM connection or deployment has been performed from this workspace.

## Recommended Pipeline

1. Local validation:
   - Install dependencies with `npm ci` in `frontend` and `pip install -r backend/requirements.txt` inside `backend/.venv`.
   - For Python dependency auditing, install `backend/requirements-dev.txt`.
   - Run `bash scripts/predeploy-check.sh`.
   - Treat the generated `frontend/dist/` folder as a build artifact.
   - Fix failures before merging or deploying.

2. Staging validation:
   - Deploy to a staging environment with production-like environment variables.
   - Run Django migrations against a staging database backup or clone.
   - Run `FRONTEND_URL=https://... API_URL=https://... bash scripts/smoke-check.sh`.
   - Run authenticated smoke checks for login, admin access, assessment creation, report generation, grounded-reference admin, and Copilot output.

3. Production readiness gate:
   - Confirm backup freshness and restore procedure.
   - Confirm rollback path for both backend code and frontend static assets.
   - Confirm production environment variables without printing secrets.
   - Confirm `DJANGO_DEBUG=false`, restricted `DJANGO_ALLOWED_HOSTS`, restricted CORS, HTTPS, valid certificates, service health, disk space, and log access.
   - Confirm `DJANGO_SECURE_SSL_REDIRECT=true`, `DJANGO_SESSION_COOKIE_SECURE=true`, `DJANGO_CSRF_COOKIE_SECURE=true`, `DJANGO_SECURE_HSTS_SECONDS=31536000` or approved equivalent, and `DJANGO_USE_X_FORWARDED_PROTO=true` when TLS terminates at a reverse proxy.
   - Confirm `FRONTEND_BASE_URL` points to the public frontend origin so password reset links do not depend on backend request host headers.
   - Confirm SMTP settings and sender address are production values, not the console backend.
   - Confirm JWT lifetimes match the expected session policy.
   - Run `bash scripts/production-config-check.sh` using the production environment profile. The validated production profile should report no script failures and no Django deployment warnings.

4. Production deployment:
   - Put the application into a controlled maintenance or low-traffic window if migrations are involved.
   - Pull or release a tagged build artifact.
   - Install locked dependencies.
   - Run migrations.
   - Build frontend assets with `npm run build` and publish the generated `frontend/dist/` artifact to the web root.
   - Restart backend process manager.
   - Run `scripts/smoke-check.sh` against the production URLs.
   - Run the agreed authenticated smoke checklist.

5. Post-deploy monitoring:
   - Check HTTP status, application logs, database errors, frontend console errors, and Copilot failures.
   - Keep rollback available until smoke checks and early monitoring are clean.

## Ops Responsibilities

- DevOps: dependency locking, build pipeline, deploy procedure, CI checks, rollback procedure, environment parity.
- MachineOps/runtime ops: VM health, disk, memory, process manager, Nginx, TLS certificates, log rotation, backups.
- DataOps: schema migrations, database backup/restore, seeded reference data, access to curated grounding sources.
- SecOps: secret handling, least-privilege credentials, restricted CORS/hosts, audit logging, dependency vulnerability checks.
- ML/AI Ops: LLM provider configuration, prompt/version tracking, grounded-reference review status, failure fallback behavior, review caveats.

## Read-Only VM Inventory Checklist

Use this only after credentials are provided through a safe channel. Do not mutate production during this step.

- Run `bash scripts/live-runtime-inventory.sh` from the deployed repository checkout when available.
- Identify OS, disk, memory, Python, Node, MySQL/MariaDB, Nginx, and process manager versions.
- List application directories, active git branch or release tag, and current uncommitted changes.
- Inspect service definitions for backend and frontend/static serving.
- Confirm environment variable locations without exposing secret values.
- Run read-only health commands such as service status, `nginx -t`, disk usage, `/api/health/`, and database connectivity checks.
- Compare production configuration against `.env.example` files and this repository's expected settings.

## Required Before Any Production Mutation

- A fresh database backup and restore test or at least a verified restore command.
- A frontend asset rollback path.
- A backend code rollback path.
- An agreed deployment window.
- Explicit confirmation that migration `backend/api/migrations/0003_groundingreference.py` may be applied.
- A smoke-test checklist owner.

## Known Gaps To Close

- Create a staging environment that mirrors production configuration.
- Add test data or fixtures so local checks can exercise the legacy unmanaged RIAT tables without requiring production data.
- Add deployment scripts only after the VM layout is known from read-only inventory.
- Wire the new CI workflow into the actual repository host and branch-protection rules once hosting is confirmed.
