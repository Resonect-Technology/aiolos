#!/bin/sh

# Remove set -e temporarily to prevent immediate exit on error
echo "=== ENTRYPOINT DEBUG START ==="
echo "Current working directory: $(pwd)"
echo "Contents of /app:"
ls -la /app/

echo "Creating /app/tmp directory..."
mkdir -p /app/tmp
echo "Directory created. Contents of /app/tmp:"
ls -la /app/tmp/

echo "Creating empty database file..."
touch /app/tmp/db.sqlite3
echo "Database file created. Contents of /app/tmp:"
ls -la /app/tmp/

echo "Checking if ace.js exists..."
ls -la /app/apps/adonis-api/build/ace.js

echo "Checking database config..."
cd /app/apps/adonis-api
echo "Current directory: $(pwd)"

echo "=== ATTEMPTING MIGRATION ==="
node build/ace.js migration:run --force

echo "=== MIGRATION COMPLETE, STARTING SERVER ==="
exec node build/bin/server.js
