#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PYTHON="${BACKEND_PYTHON:-$ROOT_DIR/backend/.venv/bin/python}"

failures=()
warnings=()

add_failure() {
  failures+=("$1")
}

add_warning() {
  warnings+=("$1")
}

env_value() {
  printf '%s' "${!1:-}"
}

env_bool_is() {
  local name="$1"
  local expected="$2"
  local value
  value="$(env_value "$name" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "$expected" ]]
}

require_nonempty() {
  local name="$1"
  if [[ -z "$(env_value "$name")" ]]; then
    add_failure "$name must be set."
  fi
}

reject_value() {
  local name="$1"
  local rejected="$2"
  if [[ "$(env_value "$name")" == "$rejected" ]]; then
    add_failure "$name still uses the unsafe placeholder value '$rejected'."
  fi
}

reject_contains() {
  local name="$1"
  local pattern="$2"
  local reason="$3"
  if [[ "$(env_value "$name")" =~ $pattern ]]; then
    add_failure "$name $reason."
  fi
}

echo "RIAT production configuration check"
echo "This script validates environment shape and runs Django deployment checks. It does not print secret values."

require_nonempty DJANGO_SECRET_KEY
reject_value DJANGO_SECRET_KEY "change-me"
reject_value DJANGO_SECRET_KEY "unsafe-local-dev-key-change-me"

require_nonempty DJANGO_ALLOWED_HOSTS
reject_contains DJANGO_ALLOWED_HOSTS '(^|,)[*]($|,)' "must not contain wildcard hosts in production"
reject_contains DJANGO_ALLOWED_HOSTS '(^|,)(localhost|127[.]0[.]0[.]1)($|,)' "must not be limited to local development hosts in production"

require_nonempty DJANGO_CORS_ALLOWED_ORIGINS
reject_contains DJANGO_CORS_ALLOWED_ORIGINS 'localhost|127[.]0[.]0[.]1' "must not contain local development origins in production"

if ! env_bool_is DJANGO_DEBUG false; then
  add_failure "DJANGO_DEBUG must be false."
fi

if ! env_bool_is DJANGO_CORS_ALLOW_ALL_ORIGINS false; then
  add_failure "DJANGO_CORS_ALLOW_ALL_ORIGINS must be false."
fi

if ! env_bool_is DJANGO_SECURE_SSL_REDIRECT true; then
  add_failure "DJANGO_SECURE_SSL_REDIRECT should be true for HTTPS production."
fi

if ! env_bool_is DJANGO_SESSION_COOKIE_SECURE true; then
  add_failure "DJANGO_SESSION_COOKIE_SECURE must be true for HTTPS production."
fi

if ! env_bool_is DJANGO_CSRF_COOKIE_SECURE true; then
  add_failure "DJANGO_CSRF_COOKIE_SECURE must be true for HTTPS production."
fi

hsts_seconds="${DJANGO_SECURE_HSTS_SECONDS:-0}"
if ! [[ "$hsts_seconds" =~ ^[0-9]+$ ]] || (( hsts_seconds < 31536000 )); then
  add_failure "DJANGO_SECURE_HSTS_SECONDS should be at least 31536000 after HTTPS is confirmed."
fi

if [[ "${RIAT_REQUIRE_PROXY_SSL_HEADER:-true}" == "true" ]] && ! env_bool_is DJANGO_USE_X_FORWARDED_PROTO true; then
  add_failure "DJANGO_USE_X_FORWARDED_PROTO should be true when TLS terminates at Nginx or another reverse proxy."
fi

require_nonempty FRONTEND_BASE_URL
if [[ -n "${FRONTEND_BASE_URL:-}" && ! "$FRONTEND_BASE_URL" =~ ^https:// ]]; then
  add_failure "FRONTEND_BASE_URL must use https:// in production."
fi

if [[ "${DJANGO_EMAIL_BACKEND:-}" == "django.core.mail.backends.console.EmailBackend" ]]; then
  add_failure "DJANGO_EMAIL_BACKEND still uses the local console backend."
fi
require_nonempty DJANGO_DEFAULT_FROM_EMAIL

if [[ "${DB_ENGINE:-mysql}" == "sqlite" ]]; then
  add_failure "DB_ENGINE must not be sqlite for production."
else
  require_nonempty DB_NAME
  require_nonempty DB_USER
  require_nonempty DB_PASSWORD
  require_nonempty DB_HOST
fi

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  require_nonempty OPENAI_MODEL
  require_nonempty OPENAI_API_URL
else
  add_warning "OPENAI_API_KEY is not set; RIAT Copilot will use deterministic fallback behavior."
fi

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  add_failure "Backend Python interpreter not found at $BACKEND_PYTHON. Set BACKEND_PYTHON or create backend/.venv."
fi

if (( ${#warnings[@]} )); then
  printf '\nWarnings:\n'
  printf 'WARN %s\n' "${warnings[@]}"
fi

if (( ${#failures[@]} )); then
  printf '\nConfiguration failures:\n' >&2
  printf 'FAIL %s\n' "${failures[@]}" >&2
  exit 1
fi

echo "Environment shape checks passed."

(
  cd "$ROOT_DIR/backend"
  "$BACKEND_PYTHON" manage.py check --deploy --fail-level WARNING
)

echo "Production configuration checks passed. No deployment was performed."
