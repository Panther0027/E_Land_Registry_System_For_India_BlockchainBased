#!/bin/sh
set -e

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database (if empty)..."
  node utils/seedIfEmpty.js 2>/dev/null || echo "Seed skipped."
fi

echo "Starting Bhumi API..."
exec node server.js
