// packages/db-core/scripts/setup-region-existing-tenants.ts
//
// 一次性腳本：把 5 筆地區基本資料（北/中/南/東/離島）灌到所有現有業務租戶
// 2026-06-22 Hank：執行長拍板「地區基本資料」要有預設 demo
//
// 規則：
//   - 排除 SYSTEM (NX99TANT0000000) 與 INNOVA (NX99TANT0000001) 兩個系統租戶
//   - 沿用 applyRegion 範式（findFirst+update/create）：可重跑、不重複
//   - actorUserId 用 SYSADMIN_USER_ID
//
// 執行：pnpm --filter db-core exec tsx scripts/setup-region-existing-tenants.ts

import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import { applyRegion } from '../prisma/seed/template/apply-region';
import { poolConfigFromDatabaseUrl } from './pgTlsPoolConfig';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSTEM_TENANT_ID = 'NX99TANT0000000';
const INNOVA_TENANT_ID = 'NX99TANT0000001';
const SYSADMIN_USER_ID = 'NX01USER0000001';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool(poolConfigFromDatabaseUrl(databaseUrl));
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenants = await prisma.nx99Tenant.findMany({
      where: {
        id: { notIn: [SYSTEM_TENANT_ID, INNOVA_TENANT_ID] },
      },
      select: { id: true, code: true, name: true },
    });

    console.log(`找到 ${tenants.length} 個業務租戶：`);
    for (const t of tenants) {
      console.log(`  - ${t.code} ${t.name} (${t.id})`);
    }

    for (const t of tenants) {
      await applyRegion(prisma, {
        tenantId: t.id,
        tier: 'LITE',
        actorUserId: SYSADMIN_USER_ID,
      });
    }

    console.log('✅ 全部完成');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ 失敗：', e);
  process.exit(1);
});
