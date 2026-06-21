/**
 * packages/db-core/scripts/cytic-execute-brand-merges.ts
 *
 * 執行執行長標記的 56 對 brand 合併 + 1 個 HENGST 特殊改名
 * 來源：docs/_team/brand-cleanup-suggestions-2026-06-22.md
 *
 * 規則：
 *   - 標「正確」+ 空白 → 合（main → sub、part.brand_id reassign + 刪 sub）
 *   - 標「跳過分兩個」(5 對) → 略
 *   - 標「應該是 HENGST」(1 對) → HAGUS + HAGNS 改名為 HENGST
 *
 * 連鎖處理：合前查 brand 是否還存在、不存在就 skip（自動處理已合掉的 sub）
 *
 * 執行: pnpm exec tsx scripts/cytic-execute-brand-merges.ts
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

// from → to（合 from 進 to）
const MERGES: Array<{ from: string; to: string }> = [
  { from: 'TOPRAM', to: 'TOPRAN' },
  { from: 'BORSCHE', to: 'PORSCHE' },
  { from: 'PORESCHE', to: 'PORSCHE' },
  { from: 'PORCHE', to: 'PORSCHE' },
  { from: 'VOTAX', to: 'VOTEX' },
  { from: 'V0TEX', to: 'VOTEX' },
  { from: 'MEAT', to: 'SEAT' },
  { from: 'PIERPURG', to: 'PIERBURG' },
  { from: 'PUERBURG', to: 'PIERBURG' },
  { from: 'VW- 一汽', to: 'VW-一汽' },
  { from: 'VW一汽', to: 'VW-一汽' },
  { from: 'GATE', to: 'GATES' },
  { from: 'GOTES', to: 'GATES' },
  { from: 'TRXTAR', to: 'TEXTAR' },
  { from: 'STABIULUS', to: 'STABILUS' },
  { from: 'COTI', to: 'CONTI' },
  { from: 'VW-暇疵', to: 'VW-瑕疵' },
  { from: 'ERNSA', to: 'ERNST' },
  { from: 'BORGARNER', to: 'BORGWARNER' },
  { from: 'COTTECO', to: 'CORTECO' },
  { from: 'DELHI', to: 'DELPHI' },
  { from: 'BENTILEY', to: 'BENTLEY' },
  { from: 'BRRU', to: 'BERU' },
  { from: 'CAMM', to: 'CAFM' },
  { from: 'O-VW', to: 'O/VW' },
  { from: '0/VW', to: 'O/VW' },
  { from: 'ORAM', to: 'OSRAM' },
  { from: 'GARREET', to: 'GARRETT' },
  { from: 'MAN ZAI (萬在)', to: 'MAN ZAI(萬在)' },
  { from: 'ITALT', to: 'ITALY' },
  { from: 'VEMO', to: 'GEMO' },
  { from: 'PORESCHE', to: 'PROSCHE' },     // 連鎖、PORESCHE 已合掉、會 skip
  { from: 'PUERBURG', to: 'PIERPURG' },    // 連鎖、PUERBURG 已合掉、會 skip
  { from: 'GERMAN', to: 'GERMANY' },
  { from: '中古件-VW', to: '中古-VW' },
  { from: '暇疵-VW', to: '瑕疵-VW' },
  { from: 'VALEO-中古', to: 'VALEO-瑕疵' },
  { from: 'ANSA/PREDOL', to: 'ANSA/PEDOL' },
  { from: 'ELDER', to: 'ELDOR' },
  { from: 'VW-X>', to: 'VW-XX' },
  { from: 'OSVAT', to: 'DSVAT' },
  { from: 'PORESCHE', to: 'BORSCHE' },     // 連鎖、PORESCHE 已合掉、會 skip
  { from: 'LAMBORGHI', to: 'LAMBORGHINI' },
  { from: 'BOSCH-瑕疵', to: 'BOSCH-中古' },
  { from: 'IMHLE', to: 'IMALE' },
  { from: 'VW-沒包裝', to: 'VW-無包裝' },
  { from: 'VW無包裝', to: 'VW-無包裝' },
  { from: '外匯-A', to: '外匯-新' },
  { from: 'VW(TW)', to: 'VW(VW)' },
  { from: '瑕疵-VALEO', to: '暇疵-VALEO' },
  { from: '中古-VALEO', to: '暇疵-VALEO' },
  { from: 'PORESCHE', to: 'PORECH' },      // 連鎖、PORESCHE 已合掉、會 skip
  { from: '中古-VALEO', to: '瑕疵-VALEO' }, // 連鎖、中古-VALEO 已合掉、會 skip
  { from: 'JUST', to: 'JOST' },
  { from: 'MASERATI', to: 'MASEERATI' },
  { from: 'PORCHE', to: 'PORESCHE' },      // 連鎖、雙方都已合掉、會 skip
];

// 特殊：HAGUS + HAGNS 都改名為 HENGST
const HENGST_GROUP = ['HAGUS', 'HAGNS'];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });
    console.log(`Tenant: ${tenant.code}`);
    console.log('');

    const beforeCount = await prisma.nx01Brand.count({ where: { tenantId: tenant.id } });
    console.log(`合併前 brand 總數: ${beforeCount}`);
    console.log('');

    let merged = 0;
    let skipped = 0;
    const errors: Array<{ from: string; to: string; reason: string }> = [];

    // 標準 merge
    console.log(`執行 ${MERGES.length} 對標準 merge...`);
    for (const m of MERGES) {
      const fromBrand = await prisma.nx01Brand.findFirst({
        where: { tenantId: tenant.id, code: m.from },
        select: { id: true },
      });
      if (!fromBrand) {
        skipped++;
        continue; // 連鎖、已合掉
      }
      const toBrand = await prisma.nx01Brand.findFirst({
        where: { tenantId: tenant.id, code: m.to },
        select: { id: true },
      });
      if (!toBrand) {
        errors.push({ from: m.from, to: m.to, reason: `to brand ${m.to} 不存在` });
        continue;
      }

      const partUpdate = await prisma.nx01Part.updateMany({
        where: { tenantId: tenant.id, brandId: fromBrand.id },
        data: { brandId: toBrand.id },
      });
      await prisma.nx01PartOemCode.updateMany({
        where: { tenantId: tenant.id, brandId: fromBrand.id },
        data: { brandId: toBrand.id },
      });
      await prisma.nx01Brand.delete({ where: { id: fromBrand.id } });
      console.log(`  ✓ ${m.from} (${partUpdate.count} 件) → ${m.to}`);
      merged++;
    }

    console.log('');
    console.log(`特殊處理：HAGUS + HAGNS → HENGST`);
    // 1. HAGUS rename to HENGST
    const hagus = await prisma.nx01Brand.findFirst({
      where: { tenantId: tenant.id, code: 'HAGUS' },
      select: { id: true },
    });
    if (hagus) {
      const hengstExist = await prisma.nx01Brand.findFirst({
        where: { tenantId: tenant.id, code: 'HENGST' },
      });
      if (hengstExist) {
        // 萬一已存在、HAGUS 直接 merge 進去
        const cnt = await prisma.nx01Part.updateMany({
          where: { tenantId: tenant.id, brandId: hagus.id },
          data: { brandId: hengstExist.id },
        });
        await prisma.nx01PartOemCode.updateMany({
          where: { tenantId: tenant.id, brandId: hagus.id },
          data: { brandId: hengstExist.id },
        });
        await prisma.nx01Brand.delete({ where: { id: hagus.id } });
        console.log(`  ✓ HAGUS (${cnt.count} 件) → HENGST (既有)`);
      } else {
        await prisma.nx01Brand.update({
          where: { id: hagus.id },
          data: { code: 'HENGST', name: 'HENGST', updatedBy: SYSADMIN_USER_ID },
        });
        console.log(`  ✓ HAGUS → 改名 HENGST`);
      }
    }
    // 2. HAGNS merge to HENGST
    const hagns = await prisma.nx01Brand.findFirst({
      where: { tenantId: tenant.id, code: 'HAGNS' },
      select: { id: true },
    });
    if (hagns) {
      const hengst = await prisma.nx01Brand.findFirstOrThrow({
        where: { tenantId: tenant.id, code: 'HENGST' },
        select: { id: true },
      });
      const cnt = await prisma.nx01Part.updateMany({
        where: { tenantId: tenant.id, brandId: hagns.id },
        data: { brandId: hengst.id },
      });
      await prisma.nx01PartOemCode.updateMany({
        where: { tenantId: tenant.id, brandId: hagns.id },
        data: { brandId: hengst.id },
      });
      await prisma.nx01Brand.delete({ where: { id: hagns.id } });
      console.log(`  ✓ HAGNS (${cnt.count} 件) → HENGST`);
    }

    const afterCount = await prisma.nx01Brand.count({ where: { tenantId: tenant.id } });
    const hengstFinal = await prisma.nx01Brand.findFirst({
      where: { tenantId: tenant.id, code: 'HENGST' },
      include: { rev_Nx01Part_brandId: false, _count: { select: { rev_Nx01Part_brandId: true } } },
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成');
    console.log('═══════════════════════════════════════════════════');
    console.log(` brand 總數: ${beforeCount} → ${afterCount} (減 ${beforeCount - afterCount})`);
    console.log(` 標準 merge: ${merged} 對成功 / ${skipped} 對連鎖跳過 / ${errors.length} 對錯誤`);
    if (hengstFinal) {
      console.log(` HENGST: ${hengstFinal._count.rev_Nx01Part_brandId} 件`);
    }
    if (errors.length) {
      console.log('');
      console.log('錯誤明細:');
      errors.forEach(e => console.log(`  ${e.from} → ${e.to}: ${e.reason}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
