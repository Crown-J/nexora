/**
 * packages/db-core/scripts/import-stock-balance.ts
 *
 * 恆迎「各倉庫存數量」補匯（2026-07-01 Hank）
 *
 * 只做一件事：把 CSV 的各倉庫存數量灌進 nx03_stock_balance（onHand / 預出量→reserved /
 * available=onHand−reserved / 預進量→in_transit / 平均進價→avgCost）。
 *   · idempotent：ON CONFLICT(tenant,part,warehouse) DO UPDATE（可重跑）
 *   · 不建 location、不灌 stock_setting、不刪 CSV（與舊 cytic-import-stock.ts 區隔）
 *   · 安全閘：parts=0 或缺 Z00~Z04 倉 → 直接 abort（保護遠端誤灌）
 *
 * 目標 DB 由 DATABASE_URL 決定。本機直接跑；遠端請由執行長本人帶 Railway DATABASE_URL 跑
 * （危險 hook 擋 rlwy.net、我方不連遠端）。
 *
 * 執行：pnpm exec tsx scripts/import-stock-balance.ts
 *   選項：DRY_RUN=1（只盤點不寫入）
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

const SYSADMIN_USER_ID = 'NX01USER0000001';
const TENANT_CODE = 'TW-100001';
const CSV_PATH = path.resolve(__dirname, '../../../docs/專案/測試資料/20260622_各倉庫存.csv');
const BATCH = 2000;
const DRY_RUN = process.env.DRY_RUN === '1';

// 實際 CSV 表頭（2026-06-22 版、BOM + trim 後）
const COL_PART = '產品料號（系統主鍵）';
const COL_WH = '倉庫編號';
const COL_QTY = '庫存數量（本倉）';
const COL_RESERVED = '預出量';
const COL_INTRANSIT = '預進量';
const COL_AVG_COST = '平均進價';

const REQUIRED_WH = ['Z00', 'Z01', 'Z02', 'Z03', 'Z04'];

function log(phase: string, msg: string) {
  console.log(`[${phase}] ${msg}`);
}
function clean(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'NULL') return null;
  return s;
}
function cleanNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s || s === 'NULL') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function sqlEscape(v: string | null | number): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return v.toString();
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const masked = databaseUrl.replace(/:\/\/[^@]+@/, '://****@');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log(' 各倉庫存數量補匯 (2026-07-01)');
    console.log(` 目標 DB: ${masked}`);
    console.log(` 模式:    ${DRY_RUN ? 'DRY RUN（不寫入）' : '實際寫入'}`);
    console.log('═══════════════════════════════════════════════════');

    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: TENANT_CODE } });
    log('INIT', `Tenant: ${tenant.code} (${tenant.id})`);

    // lookups + 安全閘
    const allParts = await prisma.nx01Part.findMany({ where: { tenantId: tenant.id }, select: { id: true, code: true } });
    const partMap = new Map<string, string>();
    for (const p of allParts) partMap.set(p.code, p.id);
    log('INIT', `part lookup ${partMap.size} 筆`);
    if (partMap.size === 0) throw new Error('⛔ 安全閘：此 DB 的租戶零件為 0 筆 — 疑似零件未匯入，中止（避免全 miss 空跑）');

    const allWh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tenant.id }, select: { id: true, code: true } });
    const whMap = new Map<string, string>();
    for (const w of allWh) whMap.set(w.code, w.id);
    const missingWh = REQUIRED_WH.filter((c) => !whMap.has(c));
    log('INIT', `warehouse lookup ${whMap.size} 筆（${Array.from(whMap.keys()).sort().join(',')}）`);
    if (missingWh.length) throw new Error(`⛔ 安全閘：缺倉 ${missingWh.join(',')} — 中止`);

    log('INIT', `讀 CSV: ${CSV_PATH}`);
    if (!fs.existsSync(CSV_PATH)) throw new Error(`⛔ 找不到 CSV：${CSV_PATH}`);
    const t0 = Date.now();
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const rows: any[] = parse(content, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true,
    });
    log('INIT', `載入 ${rows.length} 筆 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    // 表頭健檢
    const hdr = Object.keys(rows[0] ?? {});
    for (const c of [COL_PART, COL_WH, COL_QTY]) {
      if (!hdr.includes(c)) throw new Error(`⛔ CSV 缺欄位「${c}」。實際表頭：${hdr.join(' | ')}`);
    }

    log('STOCK', `${DRY_RUN ? '盤點' : '批次 upsert'} ${rows.length} 筆 → nx03_stock_balance`);
    let imported = 0, skippedNoPart = 0, skippedNoWh = 0, partMiss = 0, whMiss = 0, would = 0;
    let batch: string[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      if (DRY_RUN) { would += batch.length; batch = []; return; }
      const sql = `
        INSERT INTO nx03_stock_balance (id, tenant_id, part_id, warehouse_id, on_hand_qty, reserved_qty, available_qty, in_transit_qty, avg_cost, stock_value, last_move_at, is_active, created_at, created_by, updated_at, updated_by)
        VALUES ${batch.join(',')}
        ON CONFLICT (tenant_id, part_id, warehouse_id) DO UPDATE SET
          on_hand_qty = EXCLUDED.on_hand_qty,
          reserved_qty = EXCLUDED.reserved_qty,
          available_qty = EXCLUDED.available_qty,
          in_transit_qty = EXCLUDED.in_transit_qty,
          avg_cost = EXCLUDED.avg_cost,
          stock_value = EXCLUDED.stock_value,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `;
      await prisma.$executeRawUnsafe(sql);
      imported += batch.length;
      batch = [];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const partCode = clean(row[COL_PART]);
      const whCode = clean(row[COL_WH]);
      if (!partCode) { skippedNoPart++; continue; }
      if (!whCode) { skippedNoWh++; continue; }
      const partId = partMap.get(partCode);
      if (!partId) { partMiss++; continue; }
      const whId = whMap.get(whCode);
      if (!whId) { whMiss++; continue; }

      const onHand = cleanNum(row[COL_QTY]);
      const reserved = cleanNum(row[COL_RESERVED]);
      const inTransit = cleanNum(row[COL_INTRANSIT]);
      const avail = onHand - reserved;
      const avgCost = cleanNum(row[COL_AVG_COST]);
      const stockValue = onHand * avgCost;

      batch.push(
        `(gen_nx03_stock_balance_id(), ${sqlEscape(tenant.id)}, ${sqlEscape(partId)}, ${sqlEscape(whId)}, ${onHand}, ${reserved}, ${avail}, ${inTransit}, ${avgCost}, ${stockValue.toFixed(2)}, NOW(), TRUE, NOW(), ${sqlEscape(SYSADMIN_USER_ID)}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)})`,
      );
      if (batch.length >= BATCH) {
        await flush();
        if (i % 100000 === 0 && i > 0) log('STOCK', `  ...已處理 ${i}/${rows.length}`);
      }
    }
    await flush();

    log('STOCK', `✓ ${DRY_RUN ? `可灌 ${would}` : `灌 ${imported}`} / 空料號 ${skippedNoPart} / 空倉 ${skippedNoWh} / part miss ${partMiss} / wh miss ${whMiss}`);

    // 報告
    console.log('');
    const sbTotal = await prisma.nx03StockBalance.count({ where: { tenantId: tenant.id } });
    const sbPos = await prisma.nx03StockBalance.count({ where: { tenantId: tenant.id, onHandQty: { gt: 0 } } });
    const sbNeg = await prisma.nx03StockBalance.count({ where: { tenantId: tenant.id, onHandQty: { lt: 0 } } });
    console.log(`stock_balance 現況：total ${sbTotal} / >0 ${sbPos} / <0 ${sbNeg}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
