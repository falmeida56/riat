#!/usr/bin/env bash
set -euo pipefail

redact() {
  sed -E 's/([A-Z0-9_]*(SECRET|PASSWORD|PASS|TOKEN|KEY|API_KEY|DATABASE_URL)[A-Z0-9_]*=)[^[:space:]]+/\1<redacted>/Ig'
}

section() {
  printf '\n== %s ==\n' "$1"
}

run_optional() {
  local description="$1"
  shift
  section "$description"
  if "$@" 2>&1 | redact; then
    return 0
  fi
  echo "Command unavailable or failed: $*" | redact
}

echo "RIAT read-only runtime inventory"
echo "Generated at: $(date -Is)"
echo "Host: $(hostname 2>/dev/null || true)"

section "OS and kernel"
(cat /etc/os-release 2>/dev/null || true) | redact
uname -a | redact

section "Disk and memory"
df -h | redact
free -h 2>/dev/null | redact || true

section "Runtime versions"
for command_name in python3 python node npm mysql mariadb nginx gunicorn; do
  if command -v "$command_name" >/dev/null 2>&1; then
    printf '%s: ' "$command_name"
    "$command_name" --version 2>&1 | head -n 1 | redact
  else
    echo "$command_name: not found"
  fi
done

section "Git state"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short | redact
  git branch --show-current | sed 's/^/branch: /' | redact
  git rev-parse --short HEAD | sed 's/^/revision: /' | redact
else
  echo "Not running inside a git worktree."
fi

if command -v systemctl >/dev/null 2>&1; then
  run_optional "Service status: gunicorn" systemctl status gunicorn --no-pager --lines=0
  run_optional "Service status: nginx" systemctl status nginx --no-pager --lines=0
fi

if command -v nginx >/dev/null 2>&1; then
  run_optional "Nginx configuration test" nginx -t
fi

section "Expected RIAT paths"
for path in /var/www/riat /home/gabriel.m.rosa/riat /home/gabriel.m.rosa/riat/backend; do
  if [[ -e "$path" ]]; then
    ls -ld "$path" | redact
  else
    echo "missing: $path"
  fi
done

section "Health endpoint"
if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 5 http://127.0.0.1:8000/api/health/ 2>&1 | redact || echo "Local backend health check failed."
else
  echo "curl not found"
fi

echo
echo "Inventory complete. This script is read-only and should not print secret values."
