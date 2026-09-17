#!/usr/bin/env bash
# Запуск API + бота на одном сервере (Render и т.п.)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-8000}"

echo "Starting API on port $PORT..."
(
  cd backend
  uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
) &
API_PID=$!

echo "Starting bot..."
(
  cd bot
  python bot.py
) &
BOT_PID=$!

cleanup() {
  kill $API_PID $BOT_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Если упал один процесс — гасим оба
wait -n $API_PID $BOT_PID
cleanup
exit 1
