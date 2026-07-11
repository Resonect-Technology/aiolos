# apps/adonis-api

AdonisJS 7 API. Prisma 7 on SQLite (better-sqlite3 driver adapter), no Lucid.

## Key facts

- Prisma client: module singleton in `app/services/prisma.ts`
  (`import { prisma } from '#services/prisma'`). DB location: `DATABASE_URL` env
  or `<app root>/tmp/db.sqlite3`.
- Schema: `prisma/schema.prisma`; generated client in `generated/prisma`
  (gitignored; `prebuild`/`pretest` run `prisma generate`).
- Migrations history starts at `0_init` (baseline that adopts pre-Prisma Lucid
  databases via `prisma migrate resolve` — see `entrypoint.sh` and
  `bin/check_baseline.ts`).
- Auth is a plain `X-API-Key` header check against `ADMIN_API_KEY`
  (station/system config writes). There is no user auth.
- SSE via `@adonisjs/transmit` (`start/transmit.ts` authorizes channels; clients
  subscribe on `/__transmit`).
- Wind aggregation: in-memory 1-minute buckets (`wind_aggregation_service`)
  flushed to `wind_data_1min`; a 10-minute timer in `bin/server.ts` aggregates
  into `wind_data_10min` (upsert on stationId+timestamp).
- Wind `timestamp` columns are UTC ISO **strings** — see
  `.claude/rules/database.md` before touching any timestamp query.
- Seeds (`bin/seed.ts`) are idempotent and run on every container boot.

## Commands

```sh
node ace serve --hmr        # dev server (or root: pnpm dev)
node ace test               # Japa suite (fresh DB per run)
pnpm exec prisma migrate dev    # new migration
pnpm run seed
node ace wind:process-10min | wind:backfill-10min
```

API docs: `/docs` (adonis-autoswagger, generated from routes + JSDoc).
