#!/bin/sh
set -e

echo "=== Starting AdonisJS Application ==="
echo "Working directory: $(pwd)"

# Ensure the tmp directory exists for SQLite
echo "Creating tmp directory..."
mkdir -p tmp
echo "Directory created. Contents:"
ls -la tmp/

echo "=== Skipping migrations for now - starting server directly ==="
echo "=== Starting Server ==="
exec node build/bin/server.js
