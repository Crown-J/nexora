// 檢查匯入前置：主檔 part 現況 + 對 csv 正式料號的覆蓋率
require('dotenv').config({ path: require('path').join(__dirname, '../../../apps/nx-api/.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../generated/prisma');

function normalize(s) {
  return s.replace(/[\s#\-*.]/g, '').toLowerCase();
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}
const pool = new Pool({ connectionString: url });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  try {
    const totalPart = await p.nx01Part.count();
    const totalOem = await p.nx01PartOemCode.count();
    console.log(`主檔 nx01_part：${totalPart} 筆`);
    console.log(`既有 nx01_part_oem_code（廠牌對應子表）：${totalOem} 筆`);

    const tenants = await p.nx01Part.groupBy({
      by: ['tenantId'],
      _count: { id: true },
    });
    console.log('\n依 tenant 分布：');
    tenants.forEach((t) => console.log(`  tenant=${t.tenantId}：${t._count.id} 個 part`));

    // 撈所有 part code（normalize）
    const allParts = await p.nx01Part.findMany({
      select: { id: true, tenantId: true, code: true },
    });
    const normCodeMap = new Map(); // normCode → [{id,tenantId,code}]
    for (const pt of allParts) {
      const n = normalize(pt.code);
      if (!normCodeMap.has(n)) normCodeMap.set(n, []);
      normCodeMap.get(n).push(pt);
    }
    console.log(`\n主檔 normalize code 唯一數：${normCodeMap.size}`);

    // 讀 csv、抽 unique 正式料號（真要匯入的、跳過純去空格差異）
    const file = path.join(__dirname, '../../../docs/專案/測試資料/20260606_零件對應表.csv');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const officialReal = new Set();
    let parsedCsv = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = line.split(',');
      if (cols.length < 5) continue;
      const query = (cols[0] || '').trim();
      const official = (cols[1] || '').trim();
      const type = (cols[3] || '').trim();
      if (!query || !official) continue;
      if (type === 'B') continue; // B 略過（自己對自己）
      if (normalize(query) === normalize(official)) continue; // 純去空格差異略過
      officialReal.add(normalize(official));
      parsedCsv++;
    }
    console.log(`\nCSV 真要匯入正式料號 unique：${officialReal.size}`);

    // 覆蓋率：csv 中的正式料號、主檔有多少對得上
    let matched = 0;
    let unmatched = 0;
    const sampleUnmatched = [];
    for (const off of officialReal) {
      if (normCodeMap.has(off)) matched++;
      else {
        unmatched++;
        if (sampleUnmatched.length < 10) sampleUnmatched.push(off);
      }
    }
    console.log(`\n=== 覆蓋率 ===`);
    console.log(`  主檔有對應的：${matched} (${((matched / officialReal.size) * 100).toFixed(1)}%)`);
    console.log(`  主檔沒有的：${unmatched} (${((unmatched / officialReal.size) * 100).toFixed(1)}%)`);
    if (sampleUnmatched.length > 0) {
      console.log(`\n  沒對上的 sample（normalize）：`);
      sampleUnmatched.forEach((s) => console.log(`    ${s}`));
    }
  } catch (e) {
    console.error('FAIL:', e.code || '', e.message);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
    await pool.end();
  }
})();
