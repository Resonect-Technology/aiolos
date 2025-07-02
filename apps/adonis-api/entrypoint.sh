#!/bin/sh
set -e

echo "=== Starting AdonisJS Application ==="
echo "Working directory: $(pwd)"

# Ensure the tmp directory exists for SQLite
echo "Creating tmp directory..."
mkdir -p tmp

# Also create tmp directory in build and symlink it to the main tmp
echo "Creating build/tmp directory and symlinking..."
mkdir -p build/tmp
# Remove build/tmp if it exists and create symlink to the main tmp directory
rm -rf build/tmp
ln -sf /app/tmp build/tmp

echo "Directory structure:"
ls -la tmp/
ls -la build/tmp

echo "=== Running migrations ==="
cd build && node ace.js migration:run --force

echo "=== Starting Server ==="
exec node bin/server.js
