import path from 'node:path';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.resolve(import.meta.dirname, 'prisma/schema.prisma'),
  migrations: {
    path: path.resolve(import.meta.dirname, 'prisma/migrations'),
  },
  datasource: {
    // CLI (migrate/generate) reads this; the runtime client uses app/services/prisma.ts
    url: process.env.DATABASE_URL ?? `file:${path.resolve(import.meta.dirname, 'tmp/db.sqlite3')}`,
  },
});
