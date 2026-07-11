#!/bin/sh
set -e

echo "=== Starting Aiolos API ==="
echo "Working directory: $(pwd)"
echo "Database: ${DATABASE_URL:-'(default tmp/db.sqlite3)'}"

echo "=== Prisma migrations ==="
# Adopt a pre-Prisma (Lucid-era) database in place: mark the baseline 0_init
# migration as applied so migrate deploy only runs newer migrations.
if node build/bin/check_baseline.js | grep -q NEEDS_BASELINE; then
  echo "Pre-Prisma database detected — baselining 0_init"
  pnpm exec prisma migrate resolve --applied 0_init
fi
pnpm exec prisma migrate deploy

echo "=== Seeding (idempotent) ==="
node build/bin/seed.js

echo "=== Starting server ==="
exec node build/bin/server.js
