#!/bin/sh
set -e

echo "=== Starting Aiolos API ==="
echo "Working directory: $(pwd)"
echo "Database: ${DATABASE_URL:-'(default tmp/db.sqlite3)'}"

echo "=== Prisma migrations ==="
# Adopt a pre-Prisma (Lucid-era) database in place: mark the baseline 0_init
# migration as applied so migrate deploy only runs newer migrations.
# The check must fail hard: treating a crash (locked DB, bad DATABASE_URL) as
# "no baseline needed" would record 0_init as a failed migration and leave the
# container refusing to boot until a manual `prisma migrate resolve`.
baseline=$(node build/bin/check_baseline.js) || { echo "Baseline check failed"; exit 1; }
if echo "$baseline" | grep -q NEEDS_BASELINE; then
  echo "Pre-Prisma database detected — baselining 0_init"
  pnpm exec prisma migrate resolve --applied 0_init
fi
pnpm exec prisma migrate deploy

echo "=== Seeding (idempotent) ==="
node build/bin/seed.js

echo "=== Starting server ==="
exec node build/bin/server.js
