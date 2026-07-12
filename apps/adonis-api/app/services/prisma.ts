import { fileURLToPath } from 'node:url';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '#prisma/client';

/**
 * Module-singleton Prisma client (matches the service style used across the
 * app, e.g. stationDataCache and windAggregationService).
 *
 * The database lives at DATABASE_URL (production: set by the container) or
 * falls back to <package root>/tmp/db.sqlite3 — the same location the app
 * used since the Lucid days. Resolved relative to this file (not the Adonis
 * app service) so standalone scripts like bin/seed.ts can import it without
 * booting the framework.
 */
const url =
  process.env.DATABASE_URL ??
  `file:${fileURLToPath(new URL('../../tmp/db.sqlite3', import.meta.url))}`;

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});
