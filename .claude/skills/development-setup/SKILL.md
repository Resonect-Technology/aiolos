---
name: development-setup
description: Set up a local development environment for the Aiolos monorepo
disable-model-invocation: true
---

Set up the Aiolos development environment:

1. **Node 24 + pnpm 11** (pinned by `.nvmrc` / `packageManager`):

   ```bash
   nvm use            # or: nvm install 24
   corepack enable    # provides pnpm 11.1.2
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Backend env** - copy `apps/adonis-api/.env.example` to
   `apps/adonis-api/.env` and set `APP_KEY` (32+ chars) and `ADMIN_PASSWORD`.

4. **Database** - migrations + idempotent seeds:

   ```bash
   pnpm --filter adonis-api exec prisma migrate deploy
   pnpm --filter adonis-api run seed
   ```

5. **Run the stack**:

   ```bash
   pnpm dev           # API on :8080 (hmr) + Vite dashboard on :5173
   ```

   The Vite dev server proxies `/api` and `/__transmit` to the API.

6. **Verify**: `curl localhost:8080/healthcheck` → 200, dashboard loads on
   http://localhost:5173, and `pnpm test` is green.

**Optional:**

- Full production-like stack:
  `docker compose -f infra/docker-compose.dev.yml up --build` (Caddy on :80)
- Firmware: PlatformIO IDE extension on the host; copy
  `firmware/secrets.ini.example` → `firmware/secrets.ini`; build with
  `pio run -e aiolos-esp32dev`
- Devcontainer: "Reopen in Container" uses `.devcontainer/web-container`
