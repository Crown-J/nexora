// packages/db-core/prisma.config.ts
// Prisma CLI：migrate / introspect 等讀取 DIRECT_URL，未設定時退回 DATABASE_URL（本機 Docker 兩者可設成同一 URI）。
//
// seed 主入口支援 --mode / --tier CLI 參數（不帶參數預設 all / all）：
//   pnpm prisma db seed                              → all
//   pnpm prisma db seed -- --mode system             → 只跑 system
//   pnpm prisma db seed -- --mode test --tier lite   → 只建 LITE 測試租戶

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const migrateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed/index.ts',
  },
  datasource: {
    url: migrateUrl,
  },
});
