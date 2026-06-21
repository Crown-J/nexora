/**
 * packages/db-core/scripts/cytic-merge-final-5.ts
 *
 * 執行長 2026-06-22 拍板：剩下 5 對也合
 *
 * 執行: pnpm exec tsx scripts/cytic-merge-final-5.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CYTIC_TENANT_CODE = 'TW-100001';

const MERGES = [
  { from: 'ERA/TRW', to: 'ERA-TRW' },
  { from: 'HUTCHINS', to: 'HUTCHINSON' },
  { from: 'GFIFFT', to: 'FIFFT' },
  { from: 'GIFFE', to: 'GIEFFE' },
  { from: 'FUJIKO', to: 'FUJIKOKI' },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });
    const before = await prisma.nx01Brand.count({ where: { tenantId: tenant.id } });
    console.log(`合併前 brand: ${before}`);

    let merged = 0;
    for (const m of MERGES) {
      const fromB = await prisma.nx01Brand.findFirst({ where: { tenantId: tenant.id, code: m.from }, select: { id: true } });
      const toB = await prisma.nx01Brand.findFirst({ where: { tenantId: tenant.id, code: m.to }, select: { id: true } });
      if (!fromB || !toB) {
        console.log(`  ✗ ${m.from} → ${m.to}: 不存在`);
        continue;
      }
      const cnt = await prisma.nx01Part.updateMany({
        where: { tenantId: tenant.id, brandId: fromB.id },
        data: { brandId: toB.id },
      });
      await prisma.nx01PartOemCode.updateMany({
        where: { tenantId: tenant.id, brandId: fromB.id },
        data: { brandId: toB.id },
      });
      await prisma.nx01Brand.delete({ where: { id: fromB.id } });
      console.log(`  ✓ ${m.from} (${cnt.count} 件) → ${m.to}`);
      merged++;
    }

    const after = await prisma.nx01Brand.count({ where: { tenantId: tenant.id } });
    console.log('');
    console.log(`合併後 brand: ${after} (減 ${before - after})`);
    console.log(`成功合: ${merged}/${MERGES.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
