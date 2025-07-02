FROM node:22-slim AS base

# Install pnpm and required build tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 libsqlite3-dev

# All deps stage
FROM base AS deps
WORKDIR /app
COPY apps/adonis-api/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
# Set environment variables to force better-sqlite3 to use prebuilt binaries
ENV npm_config_platform=linux
ENV npm_config_arch=arm64
ENV npm_config_target_arch=arm64
ENV npm_config_target_platform=linux
ENV npm_config_build_from_source=false
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
# Set environment variables to force better-sqlite3 to use prebuilt binaries
ENV npm_config_platform=linux
ENV npm_config_arch=arm64
ENV npm_config_target_arch=arm64
ENV npm_config_target_platform=linux
ENV npm_config_build_from_source=false
# Use --no-frozen-lockfile to allow package.json to override
RUN pnpm install --no-frozen-lockfile --prod

# Production stage
FROM base
ENV NODE_ENV=production
# Set platform environment variables
ENV npm_config_platform=linux
ENV npm_config_arch=arm64
ENV npm_config_target_arch=arm64
ENV npm_config_target_platform=linux
WORKDIR /app

# Install system utilities for healthcheck and runtime requirements
RUN apt-get update && \
    apt-get install -y wget sqlite3 libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/adonis-api/build ./

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthcheck || exit 1

EXPOSE 8080
# Create a wrapper script with better error handling that runs migrations and seeds before starting the server
RUN echo '#!/bin/sh\n\
    # Verify SQLite is working\n\
    echo "Verifying SQLite installation..."\n\
    if node -e "try { require(\"better-sqlite3\")(\"test.db\"); console.log(\"SQLite is working correctly!\"); } catch (err) { console.error(\"SQLite error:\", err.message); process.exit(1); }"; then\n\
    echo "SQLite verification successful!"\n\
    else\n\
    echo "SQLite verification failed. Attempting to reinstall better-sqlite3..."\n\
    npm install better-sqlite3@12.2.0 --platform=linux --arch=arm64 --target_arch=arm64 --target_platform=linux\n\
    if ! node -e "try { require(\"better-sqlite3\")(\"test.db\"); console.log(\"SQLite is now working!\"); } catch (err) { console.error(\"SQLite still failing:\", err.message); process.exit(1); }"; then\n\
    echo "SQLite still not working after reinstall. Starting server anyway..."\n\
    fi\n\
    fi\n\
    \n\
    echo "Running database migrations..."\n\
    node ace migration:run --force || echo "Migrations failed, but continuing..."\n\
    \n\
    echo "Running database seeds..."\n\
    node ace db:seed || echo "Seeds failed, but continuing..."\n\
    \n\
    echo "Starting server..."\n\
    exec node ./bin/server.js\n\
    ' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
