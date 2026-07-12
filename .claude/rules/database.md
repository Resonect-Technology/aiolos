---
paths:
  - 'apps/adonis-api/prisma/**'
  - '**/*.prisma'
  - '**/migration*'
---

# Database Rules

**Stack:** Prisma 7 on SQLite via `@prisma/adapter-better-sqlite3`. Schema in
`apps/adonis-api/prisma/schema.prisma`; client is the module singleton in
`app/services/prisma.ts` (`#services/prisma`).

**Live production data:** the SQLite file is bind-mounted on the prod box. The
container entrypoint runs `prisma migrate deploy` **and the seeder on every
boot** — migrations must be additive and seeds idempotent (upsert /
create-if-missing only).

- Never edit a committed migration; create a new one
  (`pnpm --filter adonis-api exec prisma migrate dev`).
- `0_init` is the baseline that adopts pre-Prisma (Lucid-era) databases;
  `1_normalize_datetimes` converted legacy knex datetime text. Don't touch
  either.
- **Wind timestamps (`wind_data_1min/10min.timestamp`) are UTC ISO-8601
  `String`s by design** — stored as text, range-queried lexicographically. Never
  change them to `DateTime`, and always compare with `.toUTC().toISO()` values.
- The rollup tables (`temperature_hourly`, `wind_data_hourly`,
  `station_diagnostics_daily`) follow the same String-timestamp convention
  (`date` is `YYYY-MM-DD` text) and are kept **forever** — never add a retention
  policy or cleanup for them; the retention cleanup must always run AFTER the
  rollup catch-up (`bin/server.ts` chains them).
- `tendency` is a plain String constrained at app level (`WindTendency` in
  `app/types.ts`).
- Tests recreate `tmp/db.sqlite3` from migrations each run
  (`tests/bootstrap.ts`).
