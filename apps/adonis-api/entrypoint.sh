#!/bin/sh
set -e

echo "=== Starting AdonisJS Application ==="

# Change to the app directory first
cd /app/apps/adonis-api
echo "Working directory: $(pwd)"

# Ensure the tmp directory exists for SQLite (relative to current directory)
echo "Creating tmp directory..."
mkdir -p tmp
echo "Directory created. Contents:"
ls -la tmp/

echo "=== Skipping migrations for now - starting server directly ==="
echo "=== Starting Server ==="
exec node build/bin/server.js
node build/ace.js migration:run --force

echo "=== Running Database Seeders ==="
node build/ace.js db:seed --files=./database/seeders/main.js

echo "=== Starting Server ==="
exec node build/bin/server.js
