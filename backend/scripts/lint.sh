#!/usr/bin/env bash
# ==============================================================================
# Run Backend Code Quality & Lint Checks
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

echo "Running Ruff formatting check..."
ruff format --check .

echo "Running Ruff linter..."
ruff check .

echo "Running Mypy static type analysis..."
mypy app

echo "All backend lint and type checks passed successfully!"
