/**
 * packages/db-core/scripts/cytic-import-parts.ts
 *
 * 恆迎零件主檔 + 對應表 importer（2026-06-22 Hank）
 *
 * 流程：
 *   Phase 1 — buildBrands: 從 CSV 抽 534 廠牌 + normalize + 灌入 nx01_brand
 *   Phase 2 — importParts: 95840 部零件 batch insert → nx01_part
 *   Phase 3 — importOemCodes: 289869 對應 raw SQL bulk → nx01_part_oem_code
 *   Phase 4 — writeCleanupReport: 產 brand-cleanup-suggestions.md
 *   Phase 5 — cleanup: 刪 CSV
 *
 * 拍板 (Q53~Q59)：
 *   Q53: 534 廠牌全 isPart=true、之後執行長手動標 isCar
 *   Q54: partGroupId 全 null（CSV「主要族群索引碼」不灌）
 *   Q55: 車型欄不灌（加購套件、不會用到）
 *   Q56: 庫存 / 安全量 / 最高量 / 標達月日訂 不灌（屬 nx03 庫存軌）
 *   Q57: 備註 1/2 全清（PII 範式）
 *   Q58: 對應表全灌 (289869)
 *   Q59: Phase A (normalize) + Phase B (產對照表)
 *
 * Normalize 規則：trim / 全形→半形 / 全大寫 / 多空白縮一 / 保留 -X 字尾
 *
 * 執行: pnpm exec tsx scripts/cytic-import-parts.ts
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSADMIN_USER_ID = 'NX01USER0000001';
const CYTIC_TENANT_CODE = 'TW-100001';

const CSV_PARTS = path.resolve(__dirname, '../../../docs/專案/測試資料/20260606_零件資料表.csv');
const CSV_OEM = path.resolve(__dirname, '../../../docs/專案/測試資料/20260606_零件對應表.csv');
const REPORT_PATH = path.resolve(__dirname, '../../../docs/_team/brand-cleanup-suggestions-2026-06-22.md');

const BATCH_SIZE = 500;
const OEM_BATCH = 2000;

// ─── helpers ──────────────────────────────────────────────────
function log(phase: string, msg: string) {
  console.log(`[${phase}] ${msg}`);
}

/** 全形→半形 */
function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  ).replace(/　/g, ' ');
}

/** 廠牌 normalize（Phase A 自動清理） */
function normalizeBrand(raw: string): string {
  let s = (raw ?? '').toString();
  s = toHalfWidth(s);
  s = s.replace(/\s+/g, ' ').trim().toUpperCase();
  return s;
}

function clean(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'NULL') return null;
  return s;
}

function cleanNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'NULL') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Levenshtein 距離（Phase B 配對用） */
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

/** SQL string escape */
function sqlEscape(v: string | null): string {
  if (v === null) return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}

// ─── Phase 1: buildBrands ─────────────────────────────────────
type BrandStat = {
  normalized: string;
  rawSet: Set<string>;
  partCount: number;
  brandId?: string;
};

async function buildBrands(prisma: PrismaClient, tenantId: string, rawPartsRows: any[]): Promise<Map<string, string>> {
  log('BRAND', '從 CSV 抽廠牌 + normalize');

  const stats = new Map<string, BrandStat>();
  for (const row of rawPartsRows) {
    const raw = row['廠牌'];
    if (!raw || String(raw).trim() === '' || String(raw).trim() === 'NULL') continue;
    const norm = normalizeBrand(raw);
    if (!norm) continue;
    let s = stats.get(norm);
    if (!s) {
      s = { normalized: norm, rawSet: new Set(), partCount: 0 };
      stats.set(norm, s);
    }
    s.rawSet.add(String(raw));
    s.partCount++;
  }

  log('BRAND', `原始 ${rawPartsRows.length} 行 → ${stats.size} 個 unique brand（normalize 前 ${Array.from(stats.values()).reduce((sum, s) => sum + s.rawSet.size, 0)} 種）`);

  // 灌進 nx01_brand
  const brandMap = new Map<string, string>(); // normalized → brandId
  const sorted = Array.from(stats.values()).sort((a, b) => b.partCount - a.partCount);
  let sortNo = 0;
  for (const s of sorted) {
    sortNo++;
    // 用 raw SQL 直接 insert 拿 id（prisma create 慢）
    const id = await prisma.nx01Brand.create({
      data: {
        tenantId,
        code: s.normalized.slice(0, 30),
        name: s.normalized.slice(0, 100),
        isCar: false,
        isPart: true,
        sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      select: { id: true },
    });
    s.brandId = id.id;
    brandMap.set(s.normalized, id.id);
  }
  log('BRAND', `✓ ${brandMap.size} 個 brand 灌入（全 isPart=true）`);

  // 把原始 raw → brandId 也 map 一份（給 part importer 用）
  const rawToBrandId = new Map<string, string>();
  for (const s of stats.values()) {
    for (const raw of s.rawSet) {
      rawToBrandId.set(raw, s.brandId!);
    }
  }
  return rawToBrandId;
}

// ─── Phase 1.5: writeCleanupReport (在灌完 brand 後做、利用 stats) ─
async function writeCleanupReport(prisma: PrismaClient, tenantId: string) {
  log('REPORT', '產 brand-cleanup-suggestions.md');

  const allBrands = await prisma.nx01Brand.findMany({
    where: { tenantId },
    select: { id: true, code: true, name: true },
    orderBy: { sortNo: 'asc' },
  });

  // 抓 part count 給每個 brand
  const partCounts = await prisma.nx01Part.groupBy({
    by: ['brandId'],
    where: { tenantId },
    _count: { id: true },
  });
  const countMap = new Map(partCounts.map(p => [p.brandId, p._count.id]));

  type Cand = { code: string; partCount: number };
  const cands: Cand[] = allBrands.map(b => ({
    code: b.code,
    partCount: countMap.get(b.id) ?? 0,
  })).sort((a, b) => b.partCount - a.partCount);

  // 找疑似配對：編輯距離 1 或 2、且其中至少一個是「副字尾」
  type Pair = { a: string; b: string; aCount: number; bCount: number; distance: number };
  const pairs: Pair[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      const a = cands[i];
      const b = cands[j];
      // 跳過長度差距太大
      if (Math.abs(a.code.length - b.code.length) > 2) continue;
      // 跳過 -X 字尾（中古件、保留獨立）
      const baseA = a.code.replace(/-X$/, '');
      const baseB = b.code.replace(/-X$/, '');
      if (baseA === baseB && (a.code.endsWith('-X') !== b.code.endsWith('-X'))) {
        continue; // VW vs VW-X 跳
      }
      const d = levenshtein(a.code, b.code);
      if (d <= 2 && d > 0) {
        const key = [a.code, b.code].sort().join('||');
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        pairs.push({ a: a.code, b: b.code, aCount: a.partCount, bCount: b.partCount, distance: d });
      }
    }
  }
  // 排序：先看大筆數一邊（建議保留），再看編輯距離
  pairs.sort((x, y) => Math.max(y.aCount, y.bCount) - Math.max(x.aCount, x.bCount));

  // 找 -X 字尾品牌（中古件範式）
  const xSuffix = cands.filter(c => c.code.endsWith('-X'));

  const lines: string[] = [];
  lines.push(`<!-- docs/_team/brand-cleanup-suggestions-2026-06-22.md -->`);
  lines.push(`# 恆迎廠牌清理建議（CYTIC 2026-06-22）`);
  lines.push(``);
  lines.push(`> 自動產出、給執行長 review 後決定是否要合併。`);
  lines.push(`> 來源：恆迎舊 ERP 沒 brand master、人工輸入累積錯別字。`);
  lines.push(`> Phase A 自動 normalize（trim/全形/大寫）已套用、本檔列出 normalize 後仍疑似的配對。`);
  lines.push(``);
  lines.push(`## 一、總覽`);
  lines.push(``);
  lines.push(`- 灌入 brand 總數：**${cands.length}**`);
  lines.push(`- 疑似可合併配對：**${pairs.length}** 對（編輯距離 ≤ 2）`);
  lines.push(`- \`-X\` 字尾品牌（中古件、保留獨立、勿合）：**${xSuffix.length}** 個`);
  lines.push(``);
  lines.push(`## 二、疑似可合併配對（執行長 review 拍板）`);
  lines.push(``);
  lines.push(`> 規則：編輯距離 ≤ 2、長度差 ≤ 2、排除 \`-X\` 字尾規則。`);
  lines.push(`> 建議：把筆數少的併入筆數多的（main → fewer）；筆數相近時請業務確認。`);
  lines.push(``);
  lines.push(`| 配對 | 距離 | 建議保留 | 建議合併入 |`);
  lines.push(`|---|---|---|---|`);
  for (const p of pairs.slice(0, 100)) {
    const main = p.aCount >= p.bCount ? p.a : p.b;
    const mainCount = p.aCount >= p.bCount ? p.aCount : p.bCount;
    const sub = p.aCount >= p.bCount ? p.b : p.a;
    const subCount = p.aCount >= p.bCount ? p.bCount : p.aCount;
    lines.push(`| ${p.a} (${p.aCount}) ⇄ ${p.b} (${p.bCount}) | ${p.distance} | **${main}** (${mainCount} 件) | ${sub} (${subCount} 件) |`);
  }
  if (pairs.length > 100) {
    lines.push(``);
    lines.push(`...還有 ${pairs.length - 100} 對、見完整 list（執行長想看請告知）`);
  }

  lines.push(``);
  lines.push(`## 三、\`-X\` 字尾品牌（中古件範式、保留獨立）`);
  lines.push(``);
  lines.push(`> 執行長拍板：\`VW-X\` = VW 中古件、不可合進 VW。`);
  lines.push(`> 規則延伸：所有 \`*-X\` 字尾的廠牌都假設是「中古件」範式、保留獨立。`);
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
  lines.push(`2. 想合就告訴 Hank：「合 BOSH → BOSCH、BOSCHE → BOSCH」`);
  lines.push(`3. Hank 寫 \`merge-brand --from=X --to=Y\` 一次清掉`);
  lines.push(`4. \`-X\` 字尾品牌**保留**、不要合`);
  lines.push(``);

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  log('REPORT', `✓ 報告寫入: ${REPORT_PATH}`);
  log('REPORT', `  疑似配對 ${pairs.length} 對 / -X 字尾 ${xSuffix.length} 個`);
}

// ─── Phase 2: importParts ─────────────────────────────────────
type PartStats = {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
};

async function importParts(prisma: PrismaClient, tenantId: string, rawToBrandId: Map<string, string>, csvRows: any[]): Promise<PartStats> {
  log('PART', `批次匯入 ${csvRows.length} 部零件`);

  const twCountry = await prisma.nx01Country.findFirstOrThrow({ where: { code: 'TWN' } });

  const stats: PartStats = { total: csvRows.length, imported: 0, skipped: 0, errors: 0 };

  // 用 batch raw SQL insert（速度 vs prisma createMany）
  let batch: any[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    try {
      await prisma.nx01Part.createMany({ data: batch, skipDuplicates: true });
      stats.imported += batch.length;
    } catch (e: any) {
      // batch fail → fallback 逐筆
      for (const item of batch) {
        try {
          await prisma.nx01Part.create({ data: item });
          stats.imported++;
        } catch {
          stats.errors++;
        }
      }
    }
    batch = [];
  };

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const code = clean(row['產品料號']);
    if (!code) {
      stats.skipped++;
      continue;
    }
    const name = clean(row['品名']) ?? code;
    // 2026-06-26：舊料號欄已從 schema 移除（內碼 part.id 即定位器、不需另存舊號）
    // ⚠️ TODO 廠牌料號（sec_code）現為 NOT NULL、但此 CSV 來源無對應欄。
    //    執行長 2026-06-26：等準備新上傳檔時再定來源。暫以基準料號 code 頂替、屆時須換成真實廠牌料號。
    const secCode = code; // ⚠️ STOPGAP、見上
    const brandRaw = row['廠牌'];
    const brandId = brandRaw ? rawToBrandId.get(String(brandRaw)) ?? null : null;
    const cost = cleanNum(row['平均進價']);
    const priceA = cleanNum(row['A價']);
    const priceB = cleanNum(row['B價']);
    const priceC = cleanNum(row['C價']);
    const priceD = cleanNum(row['D價']);

    // CSV 沒明確「啟用」欄、預設 true、看備註 / oldCode 有「停」「停用」「停產」設 false
    const remark1 = clean(row['備註1']);
    const remark2 = clean(row['備註2']);
    const hasStop = (remark1 && /停用|停產|停供|不再進|淘汰/.test(remark1))
      || (remark2 && /停用|停產|停供|不再進|淘汰/.test(remark2));
    const isActive = !hasStop;

    batch.push({
      tenantId,
      code: code.slice(0, 50),
      name: name.slice(0, 200),
      secCode: secCode.slice(0, 50),
      brandId,
      countryId: twCountry.id,
      partGroupId: null, // Q54
      cost: cost ?? 0,
      uom: 'pcs',
      type: 1,
      isOem: true,
      priceA: priceA ?? 0,
      priceB: priceB ?? 0,
      priceC: priceC ?? 0,
      priceD: priceD ?? 0,
      returnPolicy: 'S',
      warrantyMonths: 0,
      isActive,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    });

    if (batch.length >= BATCH_SIZE) {
      await flush();
      if (i % 10000 === 0 && i > 0) log('PART', `  ...已處理 ${i}/${csvRows.length}`);
    }
  }
  await flush();
  log('PART', `✓ 匯入 ${stats.imported}/${stats.total} (skipped ${stats.skipped} / errors ${stats.errors})`);
  return stats;
}

// ─── Phase 3: importOemCodes (raw SQL bulk) ──────────────────────
async function importOemCodes(prisma: PrismaClient, tenantId: string): Promise<{ total: number; imported: number; skipped: number; partLookup: number }> {
  log('OEM', `讀對應表 CSV: ${CSV_OEM}`);
  const content = fs.readFileSync(CSV_OEM, 'utf-8');
  const rows: any[] = parse(content, {
    columns: (header: string[]) => header.map(h => h.trim()),
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });
  log('OEM', `CSV 載入 ${rows.length} 筆`);

  // 建立 part code → id 的 lookup
  log('OEM', '建立 part code → id lookup...');
  const allParts = await prisma.nx01Part.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const codeToPartId = new Map<string, string>();
  for (const p of allParts) codeToPartId.set(p.code, p.id);
  log('OEM', `lookup map 建好（${codeToPartId.size} 筆 part）`);

  const stats = { total: rows.length, imported: 0, skipped: 0, partLookup: 0 };

  // header keys
  const COL_QUERY = '查詢料號(用戶輸入時的寫法)';
  const COL_OFFICIAL = '正式料號(對應 BSTO 主檔的標準料號)⭐';
  const COL_SUB = '補充編號(多為空白)— 不是合約號碼';
  const COL_TYPE = '對應類型(O舊料號/B基準料號/P廠牌料號/T正廠料號)';
  const COL_PRIMARY = '主對應旗標(N/Y)';

  // batch raw SQL insert (faster than prisma createMany for 290k rows)
  let batchValues: string[] = [];

  const flushBatch = async () => {
    if (batchValues.length === 0) return;
    const sql = `
      INSERT INTO nx01_part_oem_code (id, tenant_id, part_id, brand_id, oem_code, remark, sort_no, created_at, created_by, updated_at, updated_by)
      VALUES ${batchValues.join(',')}
    `;
    try {
      await prisma.$executeRawUnsafe(sql);
      stats.imported += batchValues.length;
    } catch (e: any) {
      stats.skipped += batchValues.length;
    }
    batchValues = [];
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const queryCode = clean(row[COL_QUERY]);
    const officialCode = clean(row[COL_OFFICIAL]);
    if (!queryCode || !officialCode) {
      stats.skipped++;
      continue;
    }
    const partId = codeToPartId.get(officialCode);
    if (!partId) {
      stats.partLookup++;
      stats.skipped++;
      continue;
    }
    const subCode = clean(row[COL_SUB]);
    const typeCode = clean(row[COL_TYPE]); // O/B/P/T/N
    const isPrimary = clean(row[COL_PRIMARY]) === 'Y';

    const remarkParts: string[] = [];
    if (typeCode) remarkParts.push(`[${typeCode}]`);
    if (subCode) remarkParts.push(subCode);
    const remark = remarkParts.length ? remarkParts.join(' ').slice(0, 200) : null;

    const sortNo = isPrimary ? 0 : 99;
    const trimmedQuery = queryCode.slice(0, 50);

    // gen_nx01_part_oem_code_id() 是 DB function、用 default
    batchValues.push(
      `(gen_nx01_part_oem_code_id(), ${sqlEscape(tenantId)}, ${sqlEscape(partId)}, NULL, ${sqlEscape(trimmedQuery)}, ${sqlEscape(remark)}, ${sortNo}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)})`
    );

    if (batchValues.length >= OEM_BATCH) {
      await flushBatch();
      if (i % 20000 === 0 && i > 0) log('OEM', `  ...已處理 ${i}/${rows.length}`);
    }
  }
  await flushBatch();
  log('OEM', `✓ 匯入 ${stats.imported}/${stats.total} (lookup miss ${stats.partLookup} / skipped ${stats.skipped})`);
  return stats;
}

// ─── Phase 5: cleanup ─────────────────────────────────────────
async function cleanup() {
  for (const p of [CSV_PARTS, CSV_OEM]) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      log('CLEAN', `✓ 刪除 ${p}`);
    }
  }
}

// ─── main ─────────────────────────────────────────────────────
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log(' CYTIC 零件主檔 + 對應表 匯入 (2026-06-22)');
    console.log('═══════════════════════════════════════════════════');

    const tenant = await prisma.nx99Tenant.findFirstOrThrow({
      where: { code: CYTIC_TENANT_CODE },
    });
    log('INIT', `恆迎 tenant: ${tenant.code} (${tenant.id})`);

    // 讀零件 CSV（一次）
    log('INIT', `讀零件 CSV: ${CSV_PARTS}`);
    const t0 = Date.now();
    const content = fs.readFileSync(CSV_PARTS, 'utf-8');
    const rawPartsRows: any[] = parse(content, {
      columns: (header: string[]) => header.map(h => h.trim()),
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true,
    });
    log('INIT', `CSV 載入 ${rawPartsRows.length} 筆 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    console.log('');
    const rawToBrandId = await buildBrands(prisma, tenant.id, rawPartsRows);
    console.log('');
    const partStats = await importParts(prisma, tenant.id, rawToBrandId, rawPartsRows);
    console.log('');
    const oemStats = await importOemCodes(prisma, tenant.id);
    console.log('');
    await writeCleanupReport(prisma, tenant.id);
    console.log('');
    await cleanup();

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成');
    console.log('═══════════════════════════════════════════════════');
    const brandCount = await prisma.nx01Brand.count({ where: { tenantId: tenant.id } });
    const partCount = await prisma.nx01Part.count({ where: { tenantId: tenant.id } });
    const oemCount = await prisma.nx01PartOemCode.count({ where: { tenantId: tenant.id } });
    console.log(` Brand 廠牌:  ${brandCount}`);
    console.log(` Part 零件:   ${partCount} (CSV ${partStats.total})`);
    console.log(` OEM 對應:    ${oemCount} (CSV ${oemStats.total} / lookup miss ${oemStats.partLookup})`);
    console.log('');
    console.log(` Report:   ${REPORT_PATH}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
