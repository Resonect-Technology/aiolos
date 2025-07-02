#!/bin/sh
set -e

# Create the directory for the SQLite database if it doesn't exist.
mkdir -p /app/tmp

# Run migrations
node /app/apps/adonis-api/build/ace.js migration:run --force

# Run seeders
node /app/apps/adonis-api/build/ace.js db:seed --files=/app/database/seeders/main.js

# Start the application
exec node /app/apps/adonis-api/build/bin/server.js
