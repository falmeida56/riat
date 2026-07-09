#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PYTHON="$ROOT_DIR/backend/.venv/bin/python"

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  echo "Missing backend virtualenv at backend/.venv. Create it and install backend/requirements.txt first." >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "Missing frontend/node_modules. Run npm ci in frontend first." >&2
  exit 1
fi

echo "== Repository whitespace check =="
git -C "$ROOT_DIR" diff --check

echo "== Generated artifact policy check =="
if [[ -n "$(git -C "$ROOT_DIR" ls-files frontend/dist)" ]]; then
  echo "frontend/dist contains tracked files. Keep build output as a generated artifact." >&2
  git -C "$ROOT_DIR" ls-files frontend/dist >&2
  exit 1
fi

echo "== Backend package integrity =="
"$BACKEND_PYTHON" -m pip check

echo "== Backend dependency audit =="
"$BACKEND_PYTHON" -m pip_audit -r "$ROOT_DIR/backend/requirements.txt"

echo "== Backend Django system check =="
(
  cd "$ROOT_DIR/backend"
  "$BACKEND_PYTHON" manage.py check
)

echo "== Backend tests with local SQLite check database =="
(
  cd "$ROOT_DIR/backend"
  DB_ENGINE=sqlite SQLITE_DB_PATH=':memory:' "$BACKEND_PYTHON" manage.py test --noinput
)

echo "== Frontend dependency audit =="
npm --prefix "$ROOT_DIR/frontend" audit --audit-level=low

echo "== Frontend lint =="
npm --prefix "$ROOT_DIR/frontend" run lint

echo "== Frontend production build =="
npm --prefix "$ROOT_DIR/frontend" run build

echo "Pre-deploy checks passed. This script does not deploy."
