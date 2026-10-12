#!/usr/bin/env bash
# ==============================================================================
# Run Backend Development Server
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
fi

echo "Starting FastAPI backend server on http://localhost:8000..."
exec uvicorn app.main:create_application --factory --reload --host "${APP_HOST:-0.0.0.0}" --port "${APP_PORT:-8000}"
