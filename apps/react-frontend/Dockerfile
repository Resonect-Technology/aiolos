# Build-only Dockerfile for static frontend assets
FROM node:22-slim AS build

# Set up PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace config files
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY package.json ./package.json
COPY turbo.json ./turbo.json

# Copy the frontend package.json
COPY apps/react-frontend/package.json ./apps/react-frontend/package.json

# Install dependencies (including devDependencies needed for build)
RUN pnpm install --no-frozen-lockfile

# Copy the frontend code
COPY apps/react-frontend ./apps/react-frontend

# Build the static assets
WORKDIR /app/apps/react-frontend
RUN pnpm run build

# Final stage with minimal Alpine for static files
FROM alpine:latest

# Install a simple static file server if needed
RUN apk add --no-cache busybox-extras

# Copy the built files from the build stage
COPY --from=build /app/apps/react-frontend/dist /app/dist

# Create entrypoint script to copy files to volume mount
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Copying frontend build to volume..."' >> /entrypoint.sh && \
    echo 'cp -r /app/dist/* /dist/' >> /entrypoint.sh && \
    echo 'echo "Frontend files copied successfully"' >> /entrypoint.sh && \
    echo 'tail -f /dev/null' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Command that copies files to volume and keeps container running
CMD ["/entrypoint.sh"]
