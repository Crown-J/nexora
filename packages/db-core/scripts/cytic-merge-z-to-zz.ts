/**
 * packages/db-core/scripts/cytic-merge-z-to-zz.ts
 *
 * 統一瑕疵件字尾：-Z → -ZZ（執行長 2026-06-22 拍板）
 *
 * 規則：
 *   - 有對應 -ZZ 品牌（如 VW-Z + VW-ZZ）→ 合 -Z 進 -ZZ、reassign part.brand_id、刪 -Z brand
 *   - 沒對應 -ZZ 品牌（如 AUDI-Z 無 AUDI-ZZ）→ 改名 AUDI-Z → AUDI-ZZ
 *
 * 跑完後 regenerate-brand-report.ts 自動重產報告
 *
 * 執行: pnpm exec tsx scripts/cytic-merge-z-to-zz.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SYSADMIN_USER_ID = 'NX01USER0000001';
const CYTIC_TENANT_CODE = 'TW-100001';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });

    // 找所有 -Z 字尾（排除 -ZZ）品牌
    const allBrands = await prisma.nx01Brand.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, code: true },
    });
    const codeToId = new Map(allBrands.map(b => [b.code, b.id]));
    const zBrands = allBrands.filter(b => /-Z$/.test(b.code) && !b.code.endsWith('-ZZ'));
    console.log(`找到 ${zBrands.length} 個 -Z 字尾品牌:`);
    zBrands.forEach(b => console.log(`  ${b.code}`));
    console.log('');

    let merged = 0;
    let renamed = 0;
    for (const zb of zBrands) {
      const base = zb.code.replace(/-Z$/, '');
      const zzCode = `${base}-ZZ`;
      const zzId = codeToId.get(zzCode);
      if (zzId) {
        // 合：reassign part.brand_id、刪 -Z brand
        const partsUpdate = await prisma.nx01Part.updateMany({
          where: { tenantId: tenant.id, brandId: zb.id },
          data: { brandId: zzId },
        });
        await prisma.nx01PartOemCode.updateMany({
          where: { tenantId: tenant.id, brandId: zb.id },
          data: { brandId: zzId },
        });
        await prisma.nx01Brand.delete({ where: { id: zb.id } });
        console.log(`✓ 合 ${zb.code} (${partsUpdate.count} 件) → ${zzCode}`);
        merged++;
      } else {
        // 改名 -Z → -ZZ
        await prisma.nx01Brand.update({
          where: { id: zb.id },
          data: { code: zzCode, name: zzCode, updatedBy: SYSADMIN_USER_ID },
        });
        console.log(`✓ 改名 ${zb.code} → ${zzCode}`);
        renamed++;
      }
    }

    console.log('');
    console.log(`完成: 合併 ${merged} 個、改名 ${renamed} 個`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
