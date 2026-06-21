/**
 * packages/db-core/scripts/regenerate-brand-report.ts
 *
 * 重新產 brand-cleanup-suggestions.md
 *
 * 改進演算法：
 *   - 跳過短字串（≤3 字）所有配對（VW/BMW/TRW 等大廠不誤判）
 *   - 距離 / max(len) ≤ 0.25 才算疑似（4 字 1 錯 / 5 字 1 錯 / 8 字 2 錯）
 *   - 中英文不交叉配對
 *
 * 執行: pnpm exec tsx scripts/regenerate-brand-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CYTIC_TENANT_CODE = 'TW-100001';
const REPORT_PATH = path.resolve(__dirname, '../../../docs/_team/brand-cleanup-suggestions-2026-06-22.md');

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function isAscii(s: string): boolean {
  return /^[\x00-\x7F]*$/.test(s);
}

function isCjk(s: string): boolean {
  return /[一-鿿]/.test(s);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });

    const allBrands = await prisma.nx01Brand.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, code: true },
      orderBy: { sortNo: 'asc' },
    });
    const partCounts = await prisma.nx01Part.groupBy({
      by: ['brandId'],
      where: { tenantId: tenant.id },
      _count: { id: true },
    });
    const countMap = new Map(partCounts.map(p => [p.brandId, p._count.id]));

    const cands = allBrands.map(b => ({
      code: b.code,
      partCount: countMap.get(b.id) ?? 0,
    })).sort((a, b) => b.partCount - a.partCount);

    // 改進配對演算法
    type Pair = { a: string; b: string; aCount: number; bCount: number; distance: number; ratio: number };
    const pairs: Pair[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < cands.length; i++) {
      for (let j = i + 1; j < cands.length; j++) {
        const a = cands[i];
        const b = cands[j];
        const codeA = a.code;
        const codeB = b.code;

        // 跳過短字串（≤3 字、避免 VW/BMW/TRW 誤判）
        if (codeA.length <= 3 || codeB.length <= 3) continue;

        // 長度差太大跳過
        if (Math.abs(codeA.length - codeB.length) > 2) continue;

        // 中英文不交叉
        if (isCjk(codeA) !== isCjk(codeB)) continue;

        // -X 字尾規則：base 相同則跳（VW-X vs VW、BOSCH-X vs BOSCH）
        const baseA = codeA.replace(/-X$/, '');
        const baseB = codeB.replace(/-X$/, '');
        if (baseA === baseB && (codeA.endsWith('-X') !== codeB.endsWith('-X'))) continue;

        const d = levenshtein(codeA, codeB);
        if (d === 0) continue;
        if (d > 2) continue;

        // 相似度比例 ≤ 0.25（4 字最多錯 1、5 字最多錯 1、8 字最多錯 2）
        const ratio = d / Math.max(codeA.length, codeB.length);
        if (ratio > 0.25) continue;

        const key = [codeA, codeB].sort().join('||');
        if (seen.has(key)) continue;
        seen.add(key);

        pairs.push({ a: codeA, b: codeB, aCount: a.partCount, bCount: b.partCount, distance: d, ratio });
      }
    }
    pairs.sort((x, y) => Math.max(y.aCount, y.bCount) - Math.max(x.aCount, x.bCount));

    const xSuffix = cands.filter(c => c.code.endsWith('-X'));

    const lines: string[] = [];
    lines.push(`<!-- docs/_team/brand-cleanup-suggestions-2026-06-22.md -->`);
    lines.push(`# 恆迎廠牌清理建議（CYTIC 2026-06-22）`);
    lines.push(``);
    lines.push(`> 自動產出、給執行長 review 後決定是否要合併。`);
    lines.push(`> 來源：恆迎舊 ERP 沒 brand master、人工輸入累積錯別字。`);
    lines.push(`> Phase A 自動 normalize（trim/全形/大寫）已套用、本檔列出 normalize 後仍疑似的配對。`);
    lines.push(``);
    lines.push(`## 演算法規則（嚴格化、避免誤判）`);
    lines.push(``);
    lines.push(`- 雙方廠牌字數都 **≥ 4 字**（避免 VW / TRW / BMW 等 2~3 字大廠誤配）`);
    lines.push(`- 編輯距離 ≤ 2 且 **距離 / max(len) ≤ 0.25**（4 字最多錯 1、8 字最多錯 2）`);
    lines.push(`- 中文 vs 英文不交叉配對`);
    lines.push(`- \`-X\` 字尾保留獨立（中古件範式）`);
    lines.push(``);
    lines.push(`## 一、總覽`);
    lines.push(``);
    lines.push(`- 灌入 brand 總數：**${cands.length}**`);
    lines.push(`- 嚴格演算法疑似配對：**${pairs.length}** 對`);
    lines.push(`- \`-X\` 字尾品牌（保留獨立、勿合）：**${xSuffix.length}** 個`);
    lines.push(``);

    lines.push(`## 二、疑似可合併配對（執行長 review）`);
    lines.push(``);
    lines.push(`| 配對 | 距離 | 比例 | 建議保留 | 建議合併入 |`);
    lines.push(`|---|---|---|---|---|`);
    for (const p of pairs.slice(0, 100)) {
      const main = p.aCount >= p.bCount ? p.a : p.b;
      const mainCount = p.aCount >= p.bCount ? p.aCount : p.bCount;
      const sub = p.aCount >= p.bCount ? p.b : p.a;
      const subCount = p.aCount >= p.bCount ? p.bCount : p.aCount;
      lines.push(`| ${p.a} (${p.aCount}) ⇄ ${p.b} (${p.bCount}) | ${p.distance} | ${(p.ratio * 100).toFixed(0)}% | **${main}** (${mainCount} 件) | ${sub} (${subCount} 件) |`);
    }
    if (pairs.length > 100) {
      lines.push(``);
      lines.push(`...還有 ${pairs.length - 100} 對、見完整 list（執行長想看請告知）`);
    }

    lines.push(``);
    lines.push(`## 三、\`-X\` 字尾品牌（中古件範式、保留獨立）`);
    lines.push(``);
    lines.push(`| 廠牌 | 件數 |`);
    lines.push(`|---|---|`);
    for (const x of xSuffix) {
      lines.push(`| ${x.code} | ${x.partCount} |`);
    }
    if (xSuffix.length === 0) {
      lines.push(`| _（無）_ | _（無）_ |`);
    }

    lines.push(``);
    lines.push(`## 四、Top 30 廠牌（按件數）`);
    lines.push(``);
    lines.push(`| 排名 | 廠牌 | 件數 |`);
    lines.push(`|---|---|---|`);
    for (let i = 0; i < Math.min(30, cands.length); i++) {
      const c = cands[i];
      lines.push(`| ${i + 1} | ${c.code} | ${c.partCount} |`);
    }

    lines.push(``);
    lines.push(`## 五、執行長下一步`);
    lines.push(``);
    lines.push(`1. **看完疑似配對**、決定哪些要合`);
    lines.push(`2. 想合就告訴 Hank：「合 BOSH → BOSCH」`);
    lines.push(`3. Hank 寫 \`merge-brand --from=X --to=Y\` 一次清掉（reassign part.brand_id + 刪舊 brand）`);
    lines.push(`4. \`-X\` 字尾品牌**保留**、不要合`);
    lines.push(``);

    fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
    console.log(`✓ 報告寫入: ${REPORT_PATH}`);
    console.log(`  嚴格演算法配對 ${pairs.length} 對 / -X 字尾 ${xSuffix.length} 個`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
