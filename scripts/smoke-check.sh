#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
API_URL="${API_URL:-http://127.0.0.1:8000}"
TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-10}"
BODY_FILE="$(mktemp "${TMPDIR:-/tmp}/riat-smoke-body.XXXXXX")"

trim_trailing_slash() {
  printf '%s' "${1%/}"
}

FRONTEND_URL="$(trim_trailing_slash "$FRONTEND_URL")"
API_URL="$(trim_trailing_slash "$API_URL")"

check_url() {
  local label="$1"
  local url="$2"
  local expected_pattern="$3"
  local status

  if ! status="$(curl -fsS --max-time "$TIMEOUT_SECONDS" -o "$BODY_FILE" -w '%{http_code}' "$url")"; then
    echo "FAIL $label: request failed at $url" >&2
    return 1
  fi

  if [[ "$status" != 2* ]]; then
    echo "FAIL $label: expected 2xx, got $status at $url" >&2
    return 1
  fi

  if [[ -n "$expected_pattern" ]] && ! grep -Eiq "$expected_pattern" "$BODY_FILE"; then
    echo "FAIL $label: response did not match '$expected_pattern' at $url" >&2
    return 1
  fi

  echo "PASS $label: $status $url"
}

trap 'rm -f "$BODY_FILE"' EXIT

echo "RIAT read-only smoke checks"
echo "Frontend: $FRONTEND_URL"
echo "API: $API_URL"

check_url "frontend home" "$FRONTEND_URL/" "RIAT|Responsible Innovation|root"
check_url "privacy policy asset" "$FRONTEND_URL/privacy_policy_riat.pdf" ""
check_url "api health" "$API_URL/api/health/" '"status"[[:space:]]*:[[:space:]]*"ok"'

echo "Smoke checks passed. No data was created or changed."
