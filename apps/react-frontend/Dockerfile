# Build-only Dockerfile for static frontend assets
FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# The build artifacts will be in /app/dist
# Use this image as a builder or copy dist/ to your Caddy static directory
