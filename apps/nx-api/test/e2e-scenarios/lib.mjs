// apps/nx-api/test/e2e-scenarios/lib.mjs
// 驗收情境回歸測試共用庫（2026-07-11 驗收戰役腳本轉正、dailylog 0711-M~T）
//
// ⚠️ 只能對「本機開發 DB」跑：腳本會實際建單/過帳再自清還原、絕不可指向 production。
// 前置：nx-api dev server（預設 :3001、可用 E2E_API 覆寫）+ 本機 Docker DB 起著。
// 認證：讀 apps/nx-api/.env 的 JWT_SECRET 直簽 OWNER token（免動雜湊、對齊 0711 驗證範式）。
// 角色/靶料全動態查詢（不寫死快照 ID）、換 DB 快照仍可跑。

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const requireApi = createRequire(path.join(REPO, 'apps', 'nx-api', 'index.js'));
const jwt = requireApi('jsonwebtoken');
const { Client } = requireApi('pg');

const envFile = readFileSync(path.join(REPO, 'apps', 'nx-api', '.env'), 'utf8');
const grab = (k) => envFile.match(new RegExp('^' + k + '=(.+)$', 'm'))?.[1]?.trim();
export const API = process.env.E2E_API ?? 'http://localhost:3001';
const JWT_SECRET = grab('JWT_SECRET');
const DATABASE_URL = grab('DATABASE_URL')?.replace(/^"|"$/g, '');

/** 建情境上下文：連 DB、挑角色、簽 token。用完必呼 ctx.dispose()。 */
export async function makeCtx(name) {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  const one = async (sql, params) => (await db.query(sql, params)).rows[0] ?? null;

  // 營運租戶＝「第一個實際有 OWNER/SYSADMIN 帳號」的非 SYSTEM 租戶
  // （⚠️ 勿 nx99_tenant LIMIT 1：第一列是 SYSTEM、第二列可能是無帳號的平台公司——0711 教訓）
  const owner = await one(
    `SELECT u.id, u.user_account, u.tenant_id FROM nx01_user u
     JOIN nx01_user_role ur ON ur.user_id=u.id AND ur.is_active=true
     JOIN nx01_role r ON r.id=ur.role_id
     JOIN nx99_tenant t ON t.id=u.tenant_id AND UPPER(t.code) <> 'SYSTEM'
     WHERE r.code IN ('OWNER','SYSADMIN') AND u.is_active=true
       AND ($1::text IS NULL OR u.tenant_id=$1)
     ORDER BY u.tenant_id, u.user_account LIMIT 1`, [process.env.E2E_TENANT ?? null]);
  if (!owner) throw new Error('找不到 OWNER/SYSADMIN 測試帳號');
  const tenant = owner.tenant_id;

  const token = jwt.sign(
    { sub: owner.id, username: owner.user_account, tenantId: tenant, scope: 'tenant' },
    JWT_SECRET, { expiresIn: '2h' });

  let pass = 0, fail = 0;
  const ctx = {
    db, tenant, ownerId: owner.id, token, name,
    today: new Date().toISOString().slice(0, 10),
    get failCount() { return fail; },

    async call(method, p, body) {
      const res = await fetch(API + p, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data = null;
      try { data = await res.json(); } catch { /* no body */ }
      return { status: res.status, data };
    },

    check(label, cond, detail = '') {
      if (cond) { pass++; console.log(`PASS ${label}`); }
      else { fail++; console.log(`FAIL ${label} ${String(detail).slice(0, 250)}`); }
      return !!cond;
    },

    /** 動態挑演員；各腳本按需取用（查無會擲錯、視為環境不符合前置） */
    async actors() {
      if (ctx._actors) return ctx._actors;
      const customer = await one(
        `SELECT id, code FROM nx01_partner WHERE tenant_id=$1 AND partner_type='C' AND is_active=true
         AND (credit_status IS NULL OR credit_status='N') AND default_warehouse_id IS NULL
         ORDER BY code LIMIT 1`, [tenant]);
      const supplier = await one(
        `SELECT id, code FROM nx01_partner WHERE tenant_id=$1 AND partner_type='S' AND is_active=true ORDER BY code LIMIT 1`, [tenant]);
      const peer = await one(
        `SELECT id, code FROM nx01_partner WHERE tenant_id=$1 AND partner_type='O' AND is_active=true ORDER BY code LIMIT 1`, [tenant]);
      const mainWh = await one(
        `SELECT id, code FROM nx01_warehouse WHERE tenant_id=$1 AND is_main=true AND is_active=true LIMIT 1`, [tenant]);
      // 倉＋庫位成對挑兩組（調撥/收貨用）
      const whLocs = (await db.query(
        `SELECT w.id AS wh_id, w.code AS wh_code, l.id AS loc_id
         FROM nx01_warehouse w
         JOIN LATERAL (SELECT id FROM nx01_location WHERE warehouse_id=w.id AND is_active=true ORDER BY code LIMIT 1) l ON true
         WHERE w.tenant_id=$1 AND w.is_active=true ORDER BY w.code LIMIT 3`, [tenant])).rows;
      if (whLocs.length < 2) throw new Error('需至少兩個含庫位的啟用倉庫');
      // 使用者倉補位期望值（對齊 so.service 三層鏈）
      const uw = (await db.query(
        `SELECT warehouse_id, is_primary FROM nx01_user_warehouse WHERE user_id=$1 AND is_active=true`, [owner.id])).rows;
      const expectedFallbackWh =
        uw.find((r) => r.is_primary)?.warehouse_id ?? (uw.length === 1 ? uw[0].warehouse_id : null) ?? mainWh?.id ?? null;
      // 靶料一：有足量庫存（過帳流用、避開保留量）
      const stockPart = await one(
        `SELECT b.part_id, b.warehouse_id, p.code
         FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active=true
         WHERE b.tenant_id=$1 AND b.available_qty > 20 AND b.warehouse_id = $2
         ORDER BY b.available_qty DESC LIMIT 1`, [tenant, whLocs[0].wh_id]);
      // 靶料二組：同品牌 2~8 顆全有 A 價（批次調價安全靶）
      const brand = await one(
        `SELECT brand_id, COUNT(*) AS n FROM nx01_part
         WHERE tenant_id=$1 AND is_active=true AND brand_id IS NOT NULL AND price_a > 0
         GROUP BY brand_id HAVING COUNT(*) BETWEEN 2 AND 8
           AND COUNT(*) = (SELECT COUNT(*) FROM nx01_part p2 WHERE p2.brand_id=nx01_part.brand_id AND p2.tenant_id=$1 AND p2.is_active=true)
         ORDER BY COUNT(*) LIMIT 1`, [tenant]);
      const brandParts = brand
        ? (await db.query(
            `SELECT id, code, price_a, price_b, price_c, price_d FROM nx01_part
             WHERE tenant_id=$1 AND brand_id=$2 AND is_active=true ORDER BY code`, [tenant, brand.brand_id])).rows
        : [];
      const anyParts = (await db.query(
        `SELECT id, code FROM nx01_part WHERE tenant_id=$1 AND is_active=true AND price_a > 0 ORDER BY code LIMIT 2`, [tenant])).rows;
      ctx._actors = {
        customer, supplier, peer, mainWh,
        wh1: { id: whLocs[0].wh_id, code: whLocs[0].wh_code, locId: whLocs[0].loc_id },
        wh2: { id: whLocs[1].wh_id, code: whLocs[1].wh_code, locId: whLocs[1].loc_id },
        expectedFallbackWh, stockPart, brandId: brand?.brand_id ?? null, brandParts,
        part1: anyParts[0], part2: anyParts[1],
      };
      return ctx._actors;
    },

    /** 庫存守衛：備份某料全部餘額列 → 測後還原（多的列刪、值逐欄回寫）+ 清當日流水 */
    async backupBalances(partId) {
      const rows = (await db.query(
        `SELECT * FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2`, [tenant, partId])).rows;
      return { partId, rows };
    },
    async restoreBalances(bak) {
      const keep = new Set(bak.rows.map((r) => r.id));
      await db.query(
        `DELETE FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND NOT (id = ANY($3))`,
        [tenant, bak.partId, [...keep]]);
      for (const r of bak.rows) {
        await db.query(
          `UPDATE nx03_stock_balance SET on_hand_qty=$2, reserved_qty=$3, available_qty=$4, in_transit_qty=$5,
             avg_cost=$6, stock_value=$7, last_in_at=$8, last_out_at=$9, last_move_at=$10, updated_at=$11, updated_by=$12
           WHERE id=$1`,
          [r.id, r.on_hand_qty, r.reserved_qty, r.available_qty, r.in_transit_qty,
           r.avg_cost, r.stock_value, r.last_in_at, r.last_out_at, r.last_move_at, r.updated_at, r.updated_by]);
      }
      await db.query(
        `DELETE FROM nx03_stock_ledger WHERE tenant_id=$1 AND part_id=$2 AND created_at::date=CURRENT_DATE`,
        [tenant, bak.partId]);
    },

    /** 依單頭 id 精準清理（FK 順序內建；ids 空值自動略過）；同時清稽核 */
    async wipeDocs(ids) {
      const q = async (sql, arr) => { if (arr?.length) await db.query(sql, [tenant, arr.filter(Boolean)]); };
      await q(`DELETE FROM nx05_paylog_settlement WHERE tenant_id=$1 AND paylog_id = ANY($2)`, ids.paylogs);
      await q(`DELETE FROM nx05_paylog WHERE tenant_id=$1 AND id = ANY($2)`, ids.paylogs);
      await q(`DELETE FROM nx05_paylog WHERE tenant_id=$1 AND ar_id = ANY($2)`, ids.ars);
      await q(`DELETE FROM nx05_paylog WHERE tenant_id=$1 AND ap_id = ANY($2)`, ids.aps);
      await q(`DELETE FROM nx05_allowance_item WHERE allowance_id IN (SELECT id FROM nx05_allowance WHERE tenant_id=$1 AND ref_ar_id = ANY($2))`, ids.ars);
      await q(`DELETE FROM nx05_allowance WHERE tenant_id=$1 AND ref_ar_id = ANY($2)`, ids.ars);
      await q(`DELETE FROM nx05_ar_ledger WHERE tenant_id=$1 AND id = ANY($2)`, ids.ars);
      await q(`DELETE FROM nx05_ar_ledger WHERE tenant_id=$1 AND so_id = ANY($2)`, ids.sos);
      await q(`DELETE FROM nx05_ar_ledger WHERE tenant_id=$1 AND pr_id = ANY($2)`, ids.prs);
      await q(`DELETE FROM nx05_ap_ledger WHERE tenant_id=$1 AND id = ANY($2)`, ids.aps);
      await q(`DELETE FROM nx05_ap_ledger WHERE tenant_id=$1 AND po_id = ANY($2)`, ids.pos);
      await q(`DELETE FROM nx05_ap_ledger WHERE tenant_id=$1 AND rr_id = ANY($2)`, ids.rrs);
      await q(`DELETE FROM nx02_warranty_claim WHERE tenant_id=$1 AND source_pr_id = ANY($2)`, ids.prs);
      await q(`DELETE FROM nx04_sr_item WHERE sr_id = ANY($2) AND $1=$1`, ids.srs);
      await q(`DELETE FROM nx04_sr WHERE tenant_id=$1 AND id = ANY($2)`, ids.srs);
      await q(`DELETE FROM nx02_pr_item WHERE pr_id = ANY($2) AND $1=$1`, ids.prs);
      await q(`DELETE FROM nx02_pr WHERE tenant_id=$1 AND id = ANY($2)`, ids.prs);
      await q(`DELETE FROM nx02_ti_item WHERE ti_id = ANY($2) AND $1=$1`, ids.tis);
      await q(`DELETE FROM nx02_ti WHERE tenant_id=$1 AND id = ANY($2)`, ids.tis);
      await q(`DELETE FROM nx02_rr_item WHERE rr_id = ANY($2) AND $1=$1`, ids.rrs);
      await q(`DELETE FROM nx02_rr WHERE tenant_id=$1 AND id = ANY($2)`, ids.rrs);
      // 保險絲：SO 行可能被同行調貨明細引用（source_so_item_id FK）、先清引用再刪行
      await q(`DELETE FROM nx02_ti_item WHERE $1=$1 AND source_so_item_id IN (SELECT id FROM nx04_so_item WHERE so_id = ANY($2))`, ids.sos);
      await q(`DELETE FROM nx04_so_item WHERE so_id = ANY($2) AND $1=$1`, ids.sos);
      await q(`DELETE FROM nx04_so WHERE tenant_id=$1 AND id = ANY($2)`, ids.sos);
      await q(`DELETE FROM nx04_quote_item WHERE quote_id = ANY($2) AND $1=$1`, ids.quotes);
      await q(`DELETE FROM nx04_quote WHERE tenant_id=$1 AND id = ANY($2)`, ids.quotes);
      await q(`DELETE FROM nx02_po_item WHERE po_id = ANY($2) AND $1=$1`, ids.pos);
      await q(`DELETE FROM nx02_po WHERE tenant_id=$1 AND id = ANY($2)`, ids.pos);
      await q(`DELETE FROM nx03_st_item WHERE st_id = ANY($2) AND $1=$1`, ids.sts);
      await q(`DELETE FROM nx03_st WHERE tenant_id=$1 AND id = ANY($2)`, ids.sts);
      await q(`DELETE FROM nx03_disposal_item WHERE disposal_id = ANY($2) AND $1=$1`, ids.disposals);
      await q(`DELETE FROM nx03_disposal WHERE tenant_id=$1 AND id = ANY($2)`, ids.disposals);
      await q(`DELETE FROM nx03_issue_report WHERE tenant_id=$1 AND id = ANY($2)`, ids.irs);
      await q(`DELETE FROM nx05_closing WHERE tenant_id=$1 AND id = ANY($2)`, ids.closings);
      const all = Object.values(ids).flat().filter(Boolean);
      if (all.length) {
        await db.query(
          `DELETE FROM nx01_audit_log WHERE tenant_id=$1 AND occurred_at::date=CURRENT_DATE AND entity_id = ANY($2)`,
          [tenant, all]);
      }
    },

    summary() {
      console.log(`\n=== [${name}] ${pass} PASS / ${fail} FAIL ===`);
      return fail === 0;
    },
    async dispose() { await db.end(); },
  };
  return ctx;
}
