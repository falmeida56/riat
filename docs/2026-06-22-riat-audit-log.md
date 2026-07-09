# RIAT Audit Log - 2026-06-22

## Verification Baseline

- Frontend dependencies installed with `npm ci`.
- Backend virtualenv created under `backend/.venv`.
- Backend now supports local checks with `DB_ENGINE=sqlite`; production defaults remain MySQL.
- `python manage.py check` passes with MySQL settings after switching to `PyMySQL`.
- `DB_ENGINE=sqlite python manage.py check` passes.
- `DB_ENGINE=sqlite SQLITE_DB_PATH=':memory:' python manage.py test --noinput` passes with 13 targeted backend tests.
- `npm audit --audit-level=low` reports 0 vulnerabilities after `npm audit fix`.
- `npm run lint` has 0 errors and 0 warnings, down from 18 React hook/Fast Refresh warnings.
- `npm run build` passes. Route-level code splitting reduced the initial JS bundle from about 2.87 MB minified / 885 KB gzip to about 440 KB minified / 145 KB gzip.
- `bash scripts/predeploy-check.sh` passes end to end and does not deploy.
- `pip-audit -r backend/requirements.txt` reports no known Python dependency vulnerabilities.
- `python manage.py check --deploy` reports no issues when run with the intended production HTTPS/cookie/HSTS environment profile.

## Implemented Hardening And Cleanup

- Moved Django secret key, debug, allowed hosts, CORS, DB credentials, and LLM settings to environment variables.
- Added `backend/.env.example`.
- Replaced native `mysqlclient` requirement with pure-Python `PyMySQL` to unblock local setup without OS packages.
- Pinned backend Python dependencies.
- Removed tracked lint blockers from active frontend code and deleted unused broken `ResetPasswordForm.jsx`.
- Added `.DS_Store` and `._*` ignore rules; removed local metadata files from the workspace.
- Fixed unauthenticated protected-route UX so first-time visitors are redirected to login without a false "session expired" alert.
- Added autocomplete hints to login/register/reset-password fields.
- Added explicit `name`, `id`, `required`, label association, and password-manager autocomplete semantics to public auth forms.
- Fixed the forgot-password request form so submit handling prevents the browser's default page reload while the API request is being made.
- Removed stale double-`/api/api` reset endpoint props from reset-related route wrappers.
- Added a hidden username field to the reset-password form for password-manager accessibility.
- Added route-level lazy loading for frontend pages to reduce initial payload size.
- Split report PDF tooling and chart libraries into lazy/manual chunks. The report route chunk is now about 16 KB minified / 4.8 KB gzip; PDF tooling and charts remain large but isolated from initial page load.
- Fixed low-risk modal hook dependency warnings and hardened `ProtectedRoute` timer cleanup.
- Fixed remaining frontend lint warnings where dependencies were safe to declare; explicitly suppressed the new-assessment route initialization effect because adding `step` would change navigation behavior.
- Added `frontend/.env.example` for `VITE_API_URL`.
- Added environment-controlled Django production security settings for HTTPS redirects, secure cookies, HSTS, forwarded-proto handling, frame policy, referrer policy, content-type nosniff, CSRF trusted origins, static root, and log level.
- Added environment-controlled JWT lifetimes, email backend/sender/SMTP settings, and OpenAI request timeout.
- Password-reset links now prefer explicit `FRONTEND_BASE_URL` instead of deriving the public frontend URL from the backend request host.

## Grounded Recommendation Infrastructure

- Added managed `GroundingReference` backend model and migration.
- Sources can be assigned to multiple RIAT dimensions or marked as applying to all dimensions.
- Added Django admin registration with filters for source type, review status, active state, and dimensions.
- Added admin-only REST endpoints:
  - `GET/POST /api/grounding-references/`
  - `GET/PATCH/PUT/DELETE /api/grounding-references/<id>/`
- Added frontend admin page `/groundingreferences`.
- Admin UI shows affected dimension badges per source and supports filtering sources by dimension.
- Copilot context now includes approved/reviewed active grounding references related to report dimensions.
- Copilot response schema now supports `reference_sources`, rendered in the report Copilot panel.
- Added serializer and Copilot normalization tests covering grounded-source scoping and reference-source output.
- Added tests for the custom role-1 admin permission used by admin-only platform areas such as grounding references.
- Grounding-source `created_by` is now server-owned, not client-writable.
- Grounding-source updates clear specific dimension links when a source is marked as applying to all dimensions.
- Grounding-source API deletes now retire sources (`active=false`, `review_status=retired`) instead of physically removing provenance records.
- Added targeted tests for server-owned `created_by`, admin-only grounding-source access, and soft-retire behavior.
- Added a reviewed-source CSV import command and template for bulk loading grounding references after RIAT team review.
- Added parser tests for the grounding-reference import command.
- Added a public, non-sensitive `GET /api/health/` endpoint and test for deployment smoke checks.

## DevOps And Deployment Work

- Added `scripts/predeploy-check.sh` as a repeatable local validation gate.
- Added `backend/requirements-dev.txt` with `pip-audit` for reproducible Python dependency auditing.
- Added `.github/workflows/ci.yml` with backend and frontend validation jobs.
- Added `scripts/live-runtime-inventory.sh`, a read-only VM inventory helper for future production inspection.
- Added `scripts/smoke-check.sh`, a read-only URL smoke-check helper for frontend home, privacy-policy asset, and API health.
- Added `scripts/production-config-check.sh`, a non-deploying production environment gate that validates security-sensitive environment shape and runs Django `check --deploy` without printing secret values.
- Hardened `scripts/smoke-check.sh` to use a per-run temporary response body file and clearer request-failure reporting.
- Added local and CI checks that fail if generated `frontend/dist/` files are tracked as source.
- CI now uploads the generated `frontend/dist` folder as a frontend build artifact after a successful production build.
- Changed frontend build output policy: `frontend/dist/` is now ignored and untracked so CI/deploy produces it as an artifact instead of versioning hashed bundles.
- Tightened `.gitignore` so local environment variants such as `.env.local` and `.env.production` are ignored while `.env.example` remains trackable.
- Current-file secret scan for the previously hardcoded Django/database credential patterns did not find active committed secrets; old live credentials still need rotation if they were ever deployed because they remain part of repository history.
- Added `docs/devops-deployment-audit.md` covering local, staging, and production readiness gates; VM read-only inventory; backup and rollback requirements; and the difference between DevOps, runtime ops, DataOps, SecOps, and AI Ops responsibilities.
- Added `docs/evidence-grounding-source-audit.md`, mapping local meeting/email/Teams findings to platform requirements and source-ingestion workflow.
- No production VM connection, production deployment, or production mutation has been performed from this workspace.
- Running the inventory helper locally confirmed this workspace is not the deployed VM: Nginx/Gunicorn/MySQL were not present and expected production paths were missing.
- Production credentials should be provided only through a safe channel and used first for read-only inventory.

## UI/UX Findings From Browser Audit

- Public home, login, and register pages render successfully in Vite dev mode.
- Browser checks also covered forgot-password, reset-password, and unauthenticated protected-route redirect behavior.
- Public assets used by the home/footer/auth pages are present under `frontend/public`, so removing tracked `frontend/dist/` does not remove source assets.
- Login/register/forgot/reset auth forms now expose required fields and password-manager metadata in the browser DOM.
- Reset-password browser console warnings about missing username context were cleared with a hidden username field.
- Protected navigation links are visible before login; clicking Projects redirects to login. This is functional, but it may confuse first-time users because the nav does not signal that login is required.
- Register flow includes privacy-policy consent, but the `/privacy_policy_riat.pdf` asset still needs verification in the deployed/static environment.
- Authenticated admin, assessment, report, and Copilot flows could not be fully exercised locally because the legacy RIAT database tables are unmanaged and no representative MySQL data/schema dump is available in this workspace.

## Remaining Risks And Next Batches

- Rotate the previously committed Django secret key and database credentials in any live environment where they were used.
- Confirm live runtime settings: `DJANGO_DEBUG=false`, restricted `DJANGO_ALLOWED_HOSTS`, restricted CORS, HTTPS, Nginx/Gunicorn health, backups, logs, and DB access.
- Add broader backend tests for auth, report access, grounding reference CRUD permissions, and Copilot fallback/reference behavior.
- Add frontend smoke tests for public/auth/project/assessment/report/admin flows once representative data is available.
- Continue browser-level testing of Assessment route behavior once representative data/schema is available, because one route-initialization hook is intentionally constrained to submission-id changes.
- Further optimize PDF/chart dependencies if the report export path remains slow in browser testing. The heavy libraries are now isolated into `pdf-tools` and `charts` chunks instead of being bundled into the report route chunk.
- Wire CI into the actual repository host and branch protection once hosting is confirmed.
- Import curated sources from `01-resources/04--teams` only after RIAT reviewers approve source status and dimension mapping.
