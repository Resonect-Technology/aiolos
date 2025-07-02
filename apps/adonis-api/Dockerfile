FROM --platform=linux/arm64 node:22-slim

# Set the working directory
WORKDIR /app

# Install pnpm globally and system dependencies required to build native modules like better-sqlite3
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apt-get update && \
    apt-get install -y python3 make g++ sqlite3 libsqlite3-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy only the necessary package manager and config files first to leverage Docker cache
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/adonis-api/package.json ./apps/adonis-api/package.json

# Install ALL dependencies (dev and prod) to build the project
RUN pnpm install

# Copy the rest of the source code
COPY . .

# Build the AdonisJS application. This needs the dev dependencies.
RUN cd apps/adonis-api && node ace build --ignore-ts-errors

# Set Node.js environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Expose the application port
EXPOSE 8080

# Healthcheck to verify the server is running
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthcheck || exit 1

# Copy the entrypoint script and make it executable
COPY ./apps/adonis-api/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create the database directory at build time (where AdonisJS expects it)
RUN mkdir -p /app/apps/adonis-api/tmp

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# The command is now part of the entrypoint script
CMD []
