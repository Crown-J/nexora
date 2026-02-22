// C:\nexora\packages\db-core\prisma.config.ts
// Prisma CLI 設定：指定 schema/migrations 路徑，並從 .env 讀取 DATABASE_URL 給 migrate 使用

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
