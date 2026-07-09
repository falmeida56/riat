# Copilot Instructions for RIAT

## Project Overview
RIAT is a full-stack web application with a Django REST backend and a React + Vite frontend. It manages projects, surveys, assessments, and reports, with role-based access (admin/user) and JWT authentication.
The platform also includes RIAT Copilot grounding infrastructure so recommendations can be tied to reviewed scientific, framework, standard, report, dataset, or internal RIAT references.

---

## Backend (Django REST)
- **Key files:**
  - `backend/api/models.py`: Custom user, project, survey, answer, report models
  - `backend/api/views.py`: API endpoints for authentication, project/survey/report flows
  - `backend/api/serializers.py`: Data validation, token handling, serialization
  - `backend/api/permissions.py`: Role-based access control (admin/user)
  - `backend/backend/settings.py`: Django config, REST framework, JWT setup
  - `backend/backend/urls.py`: API routing
  - `backend/api/migrations/0003_groundingreference.py`: Managed grounding-reference schema
- **Conventions:**
  - Use serializers for all data validation and transformation.
  - Use class-based views (APIView, generics) for endpoints.
  - Use `IsAdminUser` for admin-only endpoints, `IsAuthenticated` for user endpoints.
  - JWT authentication via `rest_framework_simplejwt`.
  - Snake_case for files, CamelCase for classes, clear docstrings for all endpoints.
- **Patterns:**
  - Project, Survey, Assessment, Report creation/update/delete via dedicated endpoints.
  - Password reset, login, register flows via `/api/user/` endpoints.
  - Use migrations for DB schema changes.
  - Grounding references are managed through admin-only endpoints and must be scoped to one or more dimensions or explicitly marked as applying to all dimensions.
  - Only reviewed/approved active grounding references should be used as Copilot recommendation sources.

---

## Frontend (React + Vite)
- **Key files:**
  - `frontend/src/App.jsx`: Routing, providers, main app logic
  - `frontend/src/api.js`: Axios setup, JWT handling
  - `frontend/src/constants.js`: Token keys
  - `frontend/src/contexts/UserContext.jsx`: User state, localStorage
  - `frontend/src/contexts/ProjectContext.jsx`: Project state
  - `frontend/src/components/ProtectedRoute.jsx`: Route protection, token refresh
  - `frontend/src/pages/Projects.jsx`, `ProjectsAdmin.jsx`, `SurveyAdmin.jsx`, `Assessment.jsx`, `Report.jsx`: Main flows
  - `frontend/src/pages/GroundingReferences.jsx`: Admin UI for source-to-dimension grounding references
- **Conventions:**
  - PascalCase for components, camelCase for variables/functions.
  - Use context providers for user/project state.
  - Use axios for API calls, attach JWT in headers.
  - Modular components, clear separation of concerns.
  - Use protected routes for authenticated/authorized access.
- **Patterns:**
  - Login/register/reset flows update localStorage and context.
  - Role checks (admin/user) for UI and API access.
  - Project/Survey/Assessment/Report flows via dedicated pages/components.
  - Admin reference-management UI should clearly show affected dimensions for each source and support dimension-based filtering.

---

## Authentication & Authorization
- **Backend:**
  - JWT tokens issued on login/register, validated on all endpoints.
  - Role-based access via `IsAdminUser` and `IsAuthenticated`.
- **Frontend:**
  - Store tokens in localStorage (`ACCESS_TOKEN`, `REFRESH_TOKEN`).
  - Attach token to axios requests.
  - Use `ProtectedRoute` for route protection and token refresh.
  - User context manages login state and user info.

---

## Best Practices for Copilot
- Use serializers for backend data validation.
- Use context providers for frontend state.
- Use axios for API calls, modularize components.
- Always check user role for permissions.
- Do not generate RIAT guidance, advice, or recommendations without showing the grounded sources when source context is available.
- For grounded-source changes, preserve dimension mappings and review status semantics.
- Add docstrings/comments for new endpoints/components.
- Follow naming conventions and folder structure.

## DevOps And Deployment
- Use `scripts/predeploy-check.sh` before deployment or release handoff.
- CI is defined in `.github/workflows/ci.yml` and validates backend package integrity, Python dependency audit, Django checks/tests, frontend dependency audit, lint, and build.
- Keep production settings environment-driven. Do not hard-code secrets, allowed hosts, CORS origins, database credentials, LLM keys, or HTTPS settings.
- Do not mutate the production VM without a fresh backup, rollback path, and explicit deployment confirmation.
- Treat `docs/devops-deployment-audit.md` as the deployment-readiness checklist.

---

## Troubleshooting Tips
- Token expiration: Refresh token or prompt user to login again.
- Permission denied: Check user role and endpoint permissions.
- API errors: Validate request payloads and serializer logic.

---

## Testing & Admin
- Backend: Use `backend/api/tests.py` for unit tests, `admin.py` for admin registration.
- Frontend: Test flows in main pages/components.
- Run `bash scripts/predeploy-check.sh` for the local validation gate.
- For production security profile validation, run Django `check --deploy` with production HTTPS/cookie/HSTS env vars enabled.

---

## Scope
- Covers backend (Django REST) and frontend (React + Vite) only.
- Focus on authentication, permissions, project/survey/report flows, and code conventions.
- Includes deployment-readiness, CI/CD validation, grounding-source management, and external LLM/Copilot grounding behavior.

---

## References
- See referenced files for implementation templates and patterns.
- Use explicit docstrings/comments for new code.

---

Copilot should use these conventions and patterns for code suggestions, refactoring, and best practices in RIAT.
