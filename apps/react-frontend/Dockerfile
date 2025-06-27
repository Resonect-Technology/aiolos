# Build-only Dockerfile for static frontend assets
FROM node:22-slim AS build
WORKDIR /app
COPY apps/react-frontend/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
COPY apps/react-frontend/. .
RUN pnpm run build

# The build artifacts will be in /app/dist
# Use this image as a builder or copy dist/ to your Caddy static directory
