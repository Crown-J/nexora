/**
 * packages/db-core/scripts/cytic-import-stock.ts
 *
 * 恆迎庫存匯入 (2026-06-22 Hank)
 *
 * 流程：
 *   Phase 1 — buildLocations: 從 CSV 抽 unique 預設庫位、建 18 個 nx01_location
 *   Phase 2 — importStockBalance: 478832 筆 nx03_stock_balance (raw SQL bulk)
 *   Phase 3 — importStockSetting: 有 min/max 的 row 灌 nx03_part_stock_setting
 *   Phase 4 — cleanup: 刪 CSV
 *
 * 拍板 Q63~Q66 全照建議：
 *   Q63: 全灌 478832 筆 stock_balance（含 0）
 *   Q64: 建 18 個 location + 連結
 *   Q65: 負庫存照灌
 *   Q66: 備註 / 不明欄全清
 *
 * Location 對應規則 (CSV code 前綴 → warehouse)：
 *   Z000 / Z00* → Z00 總倉
 *   Z01* → Z01 台北
 *   Z02* → Z02 新莊
 *   Z03* → Z03 北投
 *   Z04* → Z04 林口
 *
 * 執行: pnpm exec tsx scripts/cytic-import-stock.ts
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
const CYTIC_TENANT_CODE = 'TW-100001';
const CSV_PATH = path.resolve(__dirname, '../../../docs/專案/測試資料/20260622_各倉庫存.csv');

const BATCH = 2000;

// ─── helpers ──────────────────────────────────────────────────
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

function getWarehouseCodeForLocation(locCode: string): string {
  // location code 前綴對應 warehouse
  if (locCode.startsWith('Z00') || locCode.startsWith('Z000')) return 'Z00';
  if (locCode.startsWith('Z01')) return 'Z01';
  if (locCode.startsWith('Z02')) return 'Z02';
  if (locCode.startsWith('Z03')) return 'Z03';
  if (locCode.startsWith('Z04')) return 'Z04';
  return 'Z00'; // 預設總倉
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
    console.log(' CYTIC 各倉庫存匯入 (2026-06-22)');
    console.log('═══════════════════════════════════════════════════');

    const tenant = await prisma.nx99Tenant.findFirstOrThrow({ where: { code: CYTIC_TENANT_CODE } });
    log('INIT', `Tenant: ${tenant.code}`);

    // 讀 CSV
    log('INIT', `讀 CSV: ${CSV_PATH}`);
    const t0 = Date.now();
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const rows: any[] = parse(content, {
      columns: (header: string[]) => header.map(h => h.trim()),
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true,
    });
    log('INIT', `載入 ${rows.length} 筆 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    // header keys (從第一個 row 取得實際 header)
    const COL_PART = '產品料號（系統主鍵）';
    const COL_WH = '貸方金額/倉庫編號（依表格判斷）';
    const COL_QTY = '庫存數量（本倉）';
    const COL_RESERVED = '預出量';
    const COL_AVG_COST = '平均進價';
    const COL_SUPPLIER = '最近廠商編號';
    const COL_SAFE = '安全存量（最低量）';
    const COL_LOC = '預設庫位';
    const COL_MAX = '最高量';

    // ─── lookup maps ──
    log('INIT', '建立 part code → id lookup...');
    const allParts = await prisma.nx01Part.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, code: true },
    });
    const partMap = new Map<string, string>();
    for (const p of allParts) partMap.set(p.code, p.id);
    log('INIT', `part lookup ${partMap.size} 筆`);

    log('INIT', '建立 warehouse code → id lookup...');
    const allWh = await prisma.nx01Warehouse.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, code: true },
    });
    const whMap = new Map<string, string>();
    for (const w of allWh) whMap.set(w.code, w.id);
    log('INIT', `warehouse lookup ${whMap.size} 筆`);

    // ─── Phase 1: buildLocations ─────────────────────────────
    console.log('');
    log('LOCATION', '從 CSV 抽 unique 預設庫位');
    const uniqueLocs = new Set<string>();
    for (const row of rows) {
      const loc = clean(row[COL_LOC]);
      if (loc) uniqueLocs.add(loc);
    }
    log('LOCATION', `共 ${uniqueLocs.size} 個 unique location codes`);

    const locMap = new Map<string, string>(); // location code → location id
    for (const locCode of Array.from(uniqueLocs).sort()) {
      const whCode = getWarehouseCodeForLocation(locCode);
      const whId = whMap.get(whCode);
      if (!whId) {
        log('LOCATION', `⚠️ ${locCode} 找不到對應倉、skip`);
        continue;
      }
      const created = await prisma.nx01Location.create({
        data: {
          tenantId: tenant.id,
          warehouseId: whId,
          code: locCode,
          name: locCode,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
        select: { id: true },
      });
      locMap.set(locCode, created.id);
      log('LOCATION', `  ✓ ${locCode} → 倉 ${whCode}`);
    }

    // ─── Phase 2: importStockBalance (raw SQL bulk) ──────────
    console.log('');
    log('STOCK', `批次匯入 ${rows.length} 筆 stock_balance`);
    let imported = 0;
    let skipped = 0;
    let partMiss = 0;
    let whMiss = 0;
    let batch: string[] = [];

    const flushStock = async () => {
      if (batch.length === 0) return;
      // unique([tenantId, partId, warehouseId]) — 用 ON CONFLICT 處理重複
      const sql = `
        INSERT INTO nx03_stock_balance (id, tenant_id, part_id, warehouse_id, on_hand_qty, reserved_qty, available_qty, in_transit_qty, avg_cost, stock_value, last_move_at, is_active, created_at, created_by, updated_at, updated_by)
        VALUES ${batch.join(',')}
        ON CONFLICT (tenant_id, part_id, warehouse_id) DO UPDATE SET
          on_hand_qty = EXCLUDED.on_hand_qty,
          reserved_qty = EXCLUDED.reserved_qty,
          available_qty = EXCLUDED.available_qty,
          avg_cost = EXCLUDED.avg_cost,
          stock_value = EXCLUDED.stock_value,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `;
      try {
        await prisma.$executeRawUnsafe(sql);
        imported += batch.length;
      } catch (e: any) {
        skipped += batch.length;
        console.error(`batch fail: ${e.message?.slice(0, 100)}`);
      }
      batch = [];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const partCode = clean(row[COL_PART]);
      const whCode = clean(row[COL_WH]);

      if (!partCode) {
        skipped++;
        continue;
      }
      if (!whCode) {
        skipped++;
        continue;
      }

      const partId = partMap.get(partCode);
      if (!partId) {
        partMiss++;
        continue;
      }
      const whId = whMap.get(whCode);
      if (!whId) {
        whMiss++;
        continue;
      }

      const onHand = cleanNum(row[COL_QTY]);
      const reserved = cleanNum(row[COL_RESERVED]);
      const avail = onHand - reserved;
      const avgCost = cleanNum(row[COL_AVG_COST]);
      const stockValue = onHand * avgCost;

      batch.push(
        `(gen_nx03_stock_balance_id(), ${sqlEscape(tenant.id)}, ${sqlEscape(partId)}, ${sqlEscape(whId)}, ${onHand}, ${reserved}, ${avail}, 0, ${avgCost}, ${stockValue.toFixed(2)}, NOW(), TRUE, NOW(), ${sqlEscape(SYSADMIN_USER_ID)}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)})`
      );

      if (batch.length >= BATCH) {
        await flushStock();
        if (i % 50000 === 0 && i > 0) log('STOCK', `  ...已處理 ${i}/${rows.length}`);
      }
    }
    await flushStock();
    log('STOCK', `✓ stock_balance 灌 ${imported} / 跳 ${skipped} / part lookup miss ${partMiss} / wh miss ${whMiss}`);

    // ─── Phase 3: importStockSetting (有 min/max 才灌) ───────
    console.log('');
    log('SETTING', `批次匯入 part_stock_setting (只灌有 min/max)`);
    let settingImported = 0;
    let settingSkipped = 0;
    batch = [];

    const flushSetting = async () => {
      if (batch.length === 0) return;
      const sql = `
        INSERT INTO nx03_part_stock_setting (id, tenant_id, part_id, warehouse_id, min_qty, max_qty, reorder_qty, is_active, default_location_id, created_at, created_by, updated_at, updated_by)
        VALUES ${batch.join(',')}
        ON CONFLICT (tenant_id, part_id, warehouse_id) DO UPDATE SET
          min_qty = EXCLUDED.min_qty,
          max_qty = EXCLUDED.max_qty,
          reorder_qty = EXCLUDED.reorder_qty,
          default_location_id = EXCLUDED.default_location_id,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `;
      try {
        await prisma.$executeRawUnsafe(sql);
        settingImported += batch.length;
      } catch (e: any) {
        settingSkipped += batch.length;
        console.error(`setting batch fail: ${e.message?.slice(0, 100)}`);
      }
      batch = [];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const partCode = clean(row[COL_PART]);
      const whCode = clean(row[COL_WH]);
      if (!partCode || !whCode) continue;
      const partId = partMap.get(partCode);
      const whId = whMap.get(whCode);
      if (!partId || !whId) continue;

      const minQty = cleanNum(row[COL_SAFE]);
      const maxQty = cleanNum(row[COL_MAX]);
      const onHand = cleanNum(row[COL_QTY]);
      const locCode = clean(row[COL_LOC]);
      const locId = locCode ? locMap.get(locCode) ?? null : null;

      // 只灌「有 min / max / 預設庫位」之一的 row
      if (minQty === 0 && maxQty === 0 && !locId) continue;

      const reorder = Math.max(0, maxQty - onHand);

      batch.push(
        `(gen_nx03_part_stock_setting_id(), ${sqlEscape(tenant.id)}, ${sqlEscape(partId)}, ${sqlEscape(whId)}, ${minQty}, ${maxQty}, ${reorder}, TRUE, ${sqlEscape(locId)}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)}, NOW(), ${sqlEscape(SYSADMIN_USER_ID)})`
      );

      if (batch.length >= BATCH) {
        await flushSetting();
        if (i % 100000 === 0 && i > 0) log('SETTING', `  ...已掃 ${i}/${rows.length}`);
      }
    }
    await flushSetting();
    log('SETTING', `✓ part_stock_setting 灌 ${settingImported} / 跳 ${settingSkipped}`);

    // ─── Phase 4: cleanup ──
    console.log('');
    if (fs.existsSync(CSV_PATH)) {
      fs.unlinkSync(CSV_PATH);
      log('CLEAN', `✓ 刪除 CSV`);
    }

    // ─── 報告 ──
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成');
    console.log('═══════════════════════════════════════════════════');
    const locCount = await prisma.nx01Location.count({ where: { tenantId: tenant.id } });
    const sbCount = await prisma.nx03StockBalance.count({ where: { tenantId: tenant.id } });
    const setCount = await prisma.nx03PartStockSetting.count({ where: { tenantId: tenant.id } });
    console.log(` Location:      ${locCount}`);
    console.log(` StockBalance:  ${sbCount}`);
    console.log(` StockSetting:  ${setCount}`);

    // 庫存統計
    const nonZero = await prisma.nx03StockBalance.count({
      where: { tenantId: tenant.id, onHandQty: { gt: 0 } },
    });
    const negative = await prisma.nx03StockBalance.count({
      where: { tenantId: tenant.id, onHandQty: { lt: 0 } },
    });
    console.log(` 庫存 > 0:      ${nonZero}`);
    console.log(` 庫存 < 0:      ${negative}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
