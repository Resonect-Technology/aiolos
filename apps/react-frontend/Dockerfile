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

# Final stage with just the static files for Caddy to serve
FROM scratch

# Copy the built files from the build stage
COPY --from=build /app/apps/react-frontend/dist /dist

# No CMD needed as this is just a data container for static files
