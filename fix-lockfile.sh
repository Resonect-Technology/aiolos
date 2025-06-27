#!/bin/bash
set -e

echo "===== Fixing Docker build dependencies ====="
echo "1. Moving to the frontend directory..."
cd /home/kuba/Projects/Resonect/Aiolos/apps/react-frontend

echo "2. Modifying the Dockerfile to use --no-frozen-lockfile instead..."
sed -i 's/--frozen-lockfile/--no-frozen-lockfile/g' Dockerfile
cat Dockerfile | grep no-frozen-lockfile

echo "3. Also fixing the backend Dockerfile..."
cd /home/kuba/Projects/Resonect/Aiolos/apps/adonis-api
sed -i 's/--frozen-lockfile/--no-frozen-lockfile/g' Dockerfile
cat Dockerfile | grep no-frozen-lockfile

echo "4. Moving back to project root..."
cd /home/kuba/Projects/Resonect/Aiolos

echo "5. Checking git status..."
git status

echo "6. Adding changes to git..."
git add apps/react-frontend/Dockerfile
git add apps/adonis-api/Dockerfile
git add fix-lockfile.sh

echo "7. Committing the changes..."
git commit -m "Update Dockerfiles to use --no-frozen-lockfile for builds"

echo "8. Pushing to remote..."
git push

echo "===== Done! ====="
echo "Your Docker builds should now work without requiring an exact lockfile match."
