/**
 * packages/db-core/scripts/cytic-restructure-sites.ts
 *
 * 改 4 據點 5 倉位結構（執行長 2026-06-22 拍板）
 *
 * 從：HQ 1 據點 + Z00~Z04 5 倉全掛 HQ
 * 改：
 *   - 林口據點 (主)   → Z00 總倉 + Z04 林口倉
 *   - 台北據點         → Z01 台北倉
 *   - 新莊據點         → Z02 新莊倉
 *   - 北投據點         → Z03 北投倉
 *
 * 補充：Z00 總倉只進貨/支援、不賣貨（先在 remark 註明、業務規則之後實作）
 *
 * 執行: pnpm exec tsx scripts/cytic-restructure-sites.ts
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

const SITES = [
  { code: 'LKO', name: '林口據點', address: '新北市林口區', isMain: true,  sortNo: 1 },
  { code: 'TPE', name: '台北據點', address: '台北市中山區龍江路342巷2號1F', isMain: false, sortNo: 2 },
  { code: 'XJG', name: '新莊據點', address: '新北市新莊區', isMain: false, sortNo: 3 },
  { code: 'BTU', name: '北投據點', address: '台北市北投區', isMain: false, sortNo: 4 },
];

// warehouse code → site code
const WH_SITE_MAP: Record<string, string> = {
  Z00: 'LKO', // 總倉 (林口)
  Z01: 'TPE',
  Z02: 'XJG',
  Z03: 'BTU',
  Z04: 'LKO',
};

const Z00_REMARK = '總倉、只進貨/支援各倉、不賣貨（業務規則 TODO）';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });
    console.log(`Tenant: ${tenant.code}`);

    // 1. 找既有 HQ site
    const hq = await prisma.nx01Site.findFirst({
      where: { tenantId: tenant.id, code: 'HQ' },
    });
    if (!hq) console.log('⚠️ 找不到既有 HQ site');

    // 2. 改 HQ → LKO 林口據點 (in-place 改名、保留 id 避免 FK 連動)
    if (hq) {
      await prisma.nx01Site.update({
        where: { id: hq.id },
        data: {
          code: 'LKO',
          name: '林口據點',
          address: '新北市林口區',
          isMain: true,
          sortNo: 1,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
      console.log(`✓ HQ → LKO 林口據點 (id: ${hq.id})`);
    }

    // 3. 新建台北 / 新莊 / 北投 3 個 site
    const siteIdMap = new Map<string, string>();
    if (hq) siteIdMap.set('LKO', hq.id);
    for (const s of SITES.slice(1)) {
      const existing = await prisma.nx01Site.findFirst({
        where: { tenantId: tenant.id, code: s.code },
      });
      if (existing) {
        siteIdMap.set(s.code, existing.id);
        console.log(`  ${s.code} 已存在、跳過`);
        continue;
      }
      const created = await prisma.nx01Site.create({
        data: {
          tenantId: tenant.id,
          code: s.code,
          name: s.name,
          address: s.address,
          isMain: false,
          sortNo: s.sortNo,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
        select: { id: true },
      });
      siteIdMap.set(s.code, created.id);
      console.log(`✓ 新建 ${s.code} ${s.name} (id: ${created.id})`);
    }

    // 4. update warehouse.site_id
    console.log('');
    console.log('Reassign 倉位到對應據點...');
    for (const [whCode, siteCode] of Object.entries(WH_SITE_MAP)) {
      const wh = await prisma.nx01Warehouse.findFirst({
        where: { tenantId: tenant.id, code: whCode },
      });
      if (!wh) { console.log(`  ⚠️ ${whCode} 找不到`); continue; }
      const siteId = siteIdMap.get(siteCode);
      if (!siteId) { console.log(`  ⚠️ ${siteCode} site 找不到`); continue; }
      const remark = whCode === 'Z00' ? Z00_REMARK : undefined;
      await prisma.nx01Warehouse.update({
        where: { id: wh.id },
        data: {
          siteId,
          ...(remark ? { remark } : {}),
          updatedBy: SYSADMIN_USER_ID,
        },
      });
      console.log(`  ✓ ${whCode} → ${siteCode}${whCode === 'Z00' ? ' (加總倉註記)' : ''}`);
    }

    // 5. update location.site_id (依 warehouse 連動)
    console.log('');
    console.log('Reassign 庫位 site_id...');
    const locs = await prisma.nx01Location.findMany({
      where: { tenantId: tenant.id },
      include: { warehouse: { select: { code: true } } },
    });
    for (const l of locs) {
      const siteCode = WH_SITE_MAP[l.warehouse.code];
      const siteId = siteIdMap.get(siteCode);
      if (!siteId) continue;
      await prisma.nx01Location.update({
        where: { id: l.id },
        data: { siteId, updatedBy: SYSADMIN_USER_ID },
      });
    }
    console.log(`  ✓ ${locs.length} 庫位 reassign`);

    // 6. 驗證
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成、現在結構：');
    console.log('═══════════════════════════════════════════════════');
    const finalSites = await prisma.nx01Site.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortNo: 'asc' },
    });
    for (const s of finalSites) {
      const whs = await prisma.nx01Warehouse.findMany({
        where: { tenantId: tenant.id, siteId: s.id },
        orderBy: { code: 'asc' },
      });
      console.log(` ${s.code} ${s.name}${s.isMain ? ' (主)' : ''}`);
      whs.forEach(w => console.log(`   └── ${w.code} ${w.name}${w.remark ? ` [${w.remark}]` : ''}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
