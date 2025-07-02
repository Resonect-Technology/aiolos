#!/bin/sh
set -e

# Ensure the directory exists (double check)
mkdir -p /app/tmp

# Create an empty database file to ensure it exists
touch /app/tmp/db.sqlite3

# Run migrations
node /app/apps/adonis-api/build/ace.js migration:run --force

# Start the application (skip seeders for now)
exec node /app/apps/adonis-api/build/bin/server.js
