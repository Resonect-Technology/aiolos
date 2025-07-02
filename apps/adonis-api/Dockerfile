FROM node:22-slim AS base

# Install pnpm and required build tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 libsqlite3-dev

# All deps stage
FROM base AS deps
WORKDIR /app
COPY apps/adonis-api/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
# Use --no-frozen-lockfile to allow package.json to override
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
# Use --no-frozen-lockfile to allow package.json to override
RUN pnpm install --no-frozen-lockfile --prod

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app

# Install system utilities for healthcheck and runtime requirements
RUN apt-get update && \
    apt-get install -y wget sqlite3 libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/adonis-api/build ./

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthcheck || exit 1

EXPOSE 8080
# Create a wrapper script that runs migrations and seeds before starting the server
RUN echo '#!/bin/sh\nnode ace migration:run --force\nnode ace db:seed\nexec node ./bin/server.js' > /app/start.sh && \
    chmod +x /app/start.sh
CMD ["/app/start.sh"]
