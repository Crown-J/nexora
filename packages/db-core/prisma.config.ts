// C:\nexora\packages\db-core\prisma.config.ts
// Prisma CLI：migrate / introspect 等讀取 DIRECT_URL，未設定時退回 DATABASE_URL（本機 Docker 兩者可設成同一 URI）。

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
