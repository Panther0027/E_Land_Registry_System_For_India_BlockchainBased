#!/bin/sh
set -e

if [ "$RUN_IMPORT" = "true" ] || [ "$RUN_SEED" = "true" ]; then
  echo "Importing dataset if database is empty..."
  node utils/seedIfEmpty.js 2>/dev/null || echo "Import skipped."
fi

echo "Starting Bhumi API..."
exec node server.js
