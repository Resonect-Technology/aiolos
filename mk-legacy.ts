import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from './generated/prisma/client.js';
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: 'file:/tmp/aiolos-data/db.sqlite3' }),
});
await prisma.$executeRawUnsafe(
  `CREATE TABLE IF NOT EXISTS adonis_schema (id integer primary key autoincrement, name varchar(255), batch integer, migration_time datetime)`,
);
await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS _prisma_migrations`);
// put a legacy-format datetime row in to prove normalization runs in-container
await prisma.$executeRawUnsafe(
  `INSERT INTO temperature_readings (station_id, temperature, reading_timestamp, created_at, updated_at) VALUES ('vasiliki-001', 25.0, '2025-07-25 11:53:00', '2025-07-25 11:53:00', '2025-07-25 11:53:00')`,
);
await prisma.$disconnect();
console.log('legacy db prepared');
