require('dotenv').config({ path: require('path').join(__dirname, '../../../apps/nx-api/.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../generated/prisma');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  try {
    const sample = await p.nx01PartOemCode.findMany({
      take: 15,
      include: {
        part: { select: { code: true, name: true } },
        brand: { select: { code: true, name: true } },
      },
    });
    console.log('既有 nx01_part_oem_code sample（15 筆）：');
    sample.forEach((s) => {
      console.log(
        `  partCode=${s.part?.code ?? '(無)'} | oemCode=${s.oemCode} | brand=${s.brand?.code ?? 'null'} | remark=${s.remark ?? ''} | sortNo=${s.sortNo}`,
      );
    });

    // 看 remark 欄是否有 type 標籤（O/B/P/T/N）
    const distinctRemark = await p.$queryRawUnsafe(
      `SELECT remark, COUNT(*) AS cnt FROM nx01_part_oem_code WHERE remark IS NOT NULL GROUP BY remark ORDER BY cnt DESC LIMIT 20`,
    );
    console.log('\nremark 欄 top 20：');
    distinctRemark.forEach((r) => console.log(`  ${r.remark}: ${r.cnt}`));

    // 統計 brand_id 是否填了
    const withBrand = await p.nx01PartOemCode.count({ where: { brandId: { not: null } } });
    const noBrand = await p.nx01PartOemCode.count({ where: { brandId: null } });
    console.log(`\nbrandId 填了：${withBrand}`);
    console.log(`brandId 為 null：${noBrand}`);
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await p.$disconnect();
    await pool.end();
  }
})();
