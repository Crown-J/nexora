// C:\nexora\packages\db-core\prisma.config.ts
// Prisma CLI：migrate / introspect 等需 PostgreSQL 直連；Supabase 請優先使用 DIRECT_URL（:5432），未設定時退回 DATABASE_URL。

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const migrateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: migrateUrl,
  },
});
