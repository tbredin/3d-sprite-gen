#!/usr/bin/env bash
# Start the FastAPI server on :8788. Run from repo root via `npm run dev:server`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UVICORN="${ROOT}/.venv/bin/uvicorn"
PORT=8788

if [[ ! -x "$UVICORN" ]]; then
  echo "missing .venv/bin/uvicorn — create the venv first:" >&2
  echo "  python3 -m venv .venv && .venv/bin/pip install -r server/requirements.txt" >&2
  echo "If you're in a git worktree, symlink the primary checkout's .venv into this tree." >&2
  exit 1
fi

if lsof -nP -tiTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port ${PORT} already in use. Free it with:" >&2
  echo "  mise run down    # or: lsof -nP -tiTCP:${PORT} -sTCP:LISTEN | xargs kill" >&2
  exit 1
fi

cd "${ROOT}/server"
exec "$UVICORN" app.main:app --reload --host 127.0.0.1 --port "${PORT}"
