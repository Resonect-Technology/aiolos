#!/bin/sh

echo "=== Starting AdonisJS Application ==="
echo "Working directory: $(pwd)"

# Ensure the tmp directory exists for SQLite
echo "Creating tmp directory..."
mkdir -p /app/apps/adonis-api/tmp
echo "Directory created. Verifying:"
ls -la /app/apps/adonis-api/tmp/

# Change to the app directory
cd /app/apps/adonis-api
echo "Changed to: $(pwd)"

echo "=== Running Database Migrations ==="
node build/ace.js migration:run --force

echo "=== Running Database Seeders ==="
node build/ace.js db:seed --files=./database/seeders/main.js

echo "=== Starting Server ==="
exec node build/bin/server.js
