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

echo "Creating AdonisJS tmp directory..."
mkdir -p /app/apps/adonis-api/tmp
echo "AdonisJS tmp directory created. Contents:"
ls -la /app/apps/adonis-api/tmp/

echo "Creating empty database file in AdonisJS tmp..."
touch /app/apps/adonis-api/tmp/db.sqlite3
echo "Database file created. Contents of /app/apps/adonis-api/tmp:"
ls -la /app/apps/adonis-api/tmp/

echo "Checking if ace.js exists..."
ls -la /app/apps/adonis-api/build/ace.js

echo "Checking database config..."
cd /app/apps/adonis-api
echo "Current directory: $(pwd)"

echo "=== ATTEMPTING MIGRATION ==="
node build/ace.js migration:run --force

echo "=== MIGRATION COMPLETE, STARTING SERVER ==="
exec node build/bin/server.js
