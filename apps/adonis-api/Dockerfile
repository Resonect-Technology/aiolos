FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# All deps stage
FROM base AS deps
WORKDIR /app
COPY apps/adonis-api/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd apps/adonis-api && node ace build --ignore-ts-errors || (pnpm install -g ts-node-maintained && node ace build --ignore-ts-errors)

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
COPY apps/adonis-api/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile --prod

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app

# Install system utilities for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/adonis-api/build ./

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthcheck || exit 1

EXPOSE 8080
CMD ["node", "./bin/server.js"]
