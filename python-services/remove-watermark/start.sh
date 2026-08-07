#!/usr/bin/env bash
# Entry point for the Remove Watermark / Logo Python sidecar.
set -euo pipefail
cd "$(dirname "$0")"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8001}"
