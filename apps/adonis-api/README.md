# Adonis API — Aiolos backend

AdonisJS 7 REST API + SSE for the Aiolos wind station. Field stations POST
sensor data over plain HTTP; the dashboard receives live wind over Server-Sent
Events (`@adonisjs/transmit`). Storage is SQLite via Prisma 7 (better-sqlite3
driver adapter).

Architecture notes for AI agents and maintainers live in
[`CLAUDE.md`](./CLAUDE.md) (Prisma singleton, migration baseline, auth model,
SSE, wind aggregation, UTC-string timestamps).

## Running

From the repo root (`pnpm dev` runs the whole stack; API on `:8080`):

```sh
pnpm dev                                    # API + dashboard (HMR)
pnpm --filter adonis-api exec prisma migrate dev   # create a migration
pnpm --filter adonis-api run seed           # idempotent seeds
pnpm --filter adonis-api test               # Japa suite (fresh DB per run)
```

API reference is auto-generated at **`/docs`** (adonis-autoswagger, from
routes + JSDoc) — browse it there instead of maintaining an endpoint list here.

## JSON naming convention

The API is **camelCase in / camelCase out** (`windSpeed`, `windDirection`,
`batteryVoltage`); database columns are snake_case (`wind_speed`, …) and Prisma
maps between them. snake_case request fields are rejected.

## Firmware contract — do not break

Deployed ESP32 stations are in the field and cannot be patched quickly. These
routes are their contract and must keep their paths and response shapes:

- `POST /api/stations/:station_id/wind`
- `POST /api/stations/:station_id/temperature`
- `POST /api/stations/:station_id/diagnostics`
- `GET  /api/stations/:station_id/config`
- `POST /api/stations/:station_id/ota-confirm`

`tests/functional/firmware_endpoints.spec.ts` pins this contract. **Never
rewrite these tests to make a change pass** — fix the change. See
`.claude/rules/production-safety.md`.
