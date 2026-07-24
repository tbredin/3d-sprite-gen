#!/usr/bin/env bash
# Train / rebuild the SDXL house LoRA (curated-iso → models/house-style-sdxl*).
# Prefer direct mode so uvicorn --reload cannot kill the train thread.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8788}"
STEPS="${STEPS:-500}"
MODE="${1:-direct}"

if [[ "$MODE" == "--api" || "$MODE" == "api" ]]; then
  echo "POST http://127.0.0.1:${PORT}/api/lora/rebuild?max_steps=${STEPS}"
  curl -sS -X POST "http://127.0.0.1:${PORT}/api/lora/rebuild?max_steps=${STEPS}" | python3 -m json.tool
  echo
  echo "Polling /api/lora/status …"
  while true; do
    body=$(curl -sS "http://127.0.0.1:${PORT}/api/lora/status")
    echo "$(date +%H:%M:%S) $body"
    state=$(printf '%s' "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state',''))")
    if [[ "$state" == "ready" || "$state" == "error" || "$state" == "missing" ]]; then
      echo "DONE state=$state"
      [[ "$state" == "ready" ]]
      exit $?
    fi
    sleep 20
  done
fi

cd "$ROOT/server"
export HOUSE_LORA_REFS="${HOUSE_LORA_REFS:-$HOME/Sites/curated-iso}"
exec "$ROOT/.venv/bin/python" - <<PY
import time
from app import house_lora

status = house_lora.start_rebuild(max_steps=int("${STEPS}"))
print(status, flush=True)
while True:
    s = house_lora.refresh_status()
    print(
        f"{s['state']} step={s.get('step')}/{s.get('max_steps')} {s.get('message')}",
        flush=True,
    )
    if s["state"] in ("ready", "error"):
        raise SystemExit(0 if s["state"] == "ready" else 1)
    time.sleep(10)
PY
