# Turborepo Docker build for the Aiolos dashboard (React + Vite, served by nginx)
# Build from the monorepo root:
#   docker build -f apps/react-frontend/Dockerfile -t aiolos-frontend .
FROM node:24-alpine AS base
RUN apk add --no-cache --no-scripts libc6-compat
WORKDIR /app
RUN npm install -g pnpm@11.1.2 turbo

# 1) Create a pruned workspace for the frontend only
FROM base AS builder
COPY . .
RUN turbo prune react-frontend --docker

# 2) Install deps using the pruned lockfile, then copy sources
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=builder /app/out/full/ .
RUN pnpm install --frozen-lockfile --ignore-scripts

# 3) Build the frontend bundle (tsc -b && vite build)
RUN turbo build --filter=react-frontend

# 4) Production image with nginx serving static files
FROM nginx:alpine AS production

COPY --from=installer /app/apps/react-frontend/dist /usr/share/nginx/html
COPY apps/react-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
