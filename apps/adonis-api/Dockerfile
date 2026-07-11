# Turborepo Docker build for the Aiolos API (AdonisJS 7 + Prisma on SQLite)
# Build from the monorepo root:
#   docker build -f apps/adonis-api/Dockerfile -t aiolos-backend .
FROM node:24-alpine AS base

FROM base AS builder
RUN apk add --no-cache --no-scripts libc6-compat
WORKDIR /app
RUN npm install -g turbo

COPY . .

# Generate a partial monorepo with a pruned lockfile for the API
RUN turbo prune adonis-api --docker

FROM base AS installer
# python3/make/g++ are required to compile better-sqlite3
RUN apk add --no-cache --no-scripts libc6-compat python3 make g++
WORKDIR /app
RUN npm install -g pnpm@11.1.2 turbo

# Install dependencies first (they change less often than sources)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy sources and re-run install so pnpm can link workspace bins
COPY --from=builder /app/out/full/ .
RUN pnpm install --frozen-lockfile --ignore-scripts

# better-sqlite3 needs its native build (skipped above by --ignore-scripts)
RUN pnpm --recursive rebuild better-sqlite3

# Build the app (prebuild runs `prisma generate`)
RUN turbo build --filter=adonis-api

# Production runner
FROM installer AS production

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
# SQLite lives on a bind mount at /data (docker compose: ./data:/data)
ENV DATABASE_URL=file:/data/db.sqlite3

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthcheck || exit 1

WORKDIR /app/apps/adonis-api
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
