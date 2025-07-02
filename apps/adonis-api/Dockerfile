FROM node:22-slim

# Set the working directory to the AdonisJS project root
WORKDIR /app

# Install system dependencies required to build native modules like better-sqlite3
RUN apt-get update && \
    apt-get install -y python3 make g++ sqlite3 libsqlite3-dev --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY apps/adonis-api/package.json ./package.json

# Install dependencies
RUN npm install

# Copy the entire AdonisJS project structure
COPY apps/adonis-api/ ./

# Build the AdonisJS application
RUN node ace build --ignore-ts-errors

# Set Node.js environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Create the tmp directory (following AdonisJS structure)
RUN mkdir -p tmp

# Expose the application port
EXPOSE 8080

# Healthcheck to verify the server is running
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthcheck || exit 1

# Copy and setup entrypoint script
COPY apps/adonis-api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]

CMD []
