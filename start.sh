#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Railway/Nixpacks venv
if [ -f /opt/venv/bin/activate ]; then
  # shellcheck disable=SC1091
  . /opt/venv/bin/activate
fi

PORT="${PORT:-8000}"
PYTHON="${PYTHON:-python3}"
command -v python3 >/dev/null 2>&1 || PYTHON=python
command -v python >/dev/null 2>&1 && PYTHON=python

echo "Starting API on port $PORT with $PYTHON..."
(
  cd backend
  $PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
) &
API_PID=$!

echo "Starting bot..."
(
  cd bot
  $PYTHON bot.py
) &
BOT_PID=$!

cleanup() {
  kill $API_PID $BOT_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n $API_PID $BOT_PID
cleanup
exit 1
