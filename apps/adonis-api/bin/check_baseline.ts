/*
|--------------------------------------------------------------------------
| Prisma baseline detector
|--------------------------------------------------------------------------
|
| Prints NEEDS_BASELINE when the database predates Prisma (has the Lucid
| adonis_schema table but no _prisma_migrations table). The entrypoint then
| runs `prisma migrate resolve --applied 0_init` before `migrate deploy`,
| adopting the existing data in place instead of re-creating tables.
|
| A fresh/empty database prints nothing — migrate deploy runs 0_init there.
|
*/

import { prisma } from '#services/prisma';

const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
  `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('adonis_schema', '_prisma_migrations')`,
);
const names = tables.map((t) => t.name);

if (names.includes('adonis_schema') && !names.includes('_prisma_migrations')) {
  console.log('NEEDS_BASELINE');
}

await prisma.$disconnect();
