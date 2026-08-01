// apps/nx-api/src/shared/nx05/nx05-post-so-to-gl.ts
// ⭐ 總帳脊椎 B6：第一條劇本接上總帳——銷貨單簽收完成 → 自動產生分錄（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.5 §6 B6
//
// 上位原則③ 因果單向：本檔**只讀營運資料、只寫總帳**，⛔ 一行都不回頭寫 nx04/nx03。
//
// 🔴 為什麼過的是 SO-CR（賒銷）而不是規格建議的 SO-CA（現銷）：
//   實測 `createArFromShippedSo` **對所有銷貨單無條件建應收**（現金客戶也一樣）。
//   總帳若記成現銷（借 1101 現金），就會和應收子帳講不同的話——B7 的子帳 vs 總帳驗證第一條就會爆。
//   ⭐ 帳要跟著系統實際做的事走，不是跟著理想流程走。
//   ⚠ 將來若支援「不建應收的真現銷」，再依該旗標分流 SO-CA。
//
// 🔴 安全閘：這支**只在租戶已經啟用總帳時才動作**（有過帳規則 ＋ 該日期有開帳中的會計期間）。
//   沒啟用就回傳 skip 理由、不擋銷貨流程——現有 8.8 萬張銷貨單不受影響。
//   ⚠ 但 skip 不是沒事：缺的分錄會被 B7 的子帳 vs 總帳驗證抓出來，所以理由要回傳給呼叫端記錄。

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { postByRule } from './nx05-post-by-rule';

/** 沒過帳的原因。⚠ 全部屬「租戶還沒把總帳設起來」，不是資料錯。 */
export type GlSkipReason =
  | 'ALREADY_POSTED'
  | 'SO_NOT_FOUND'
  | 'NO_POSTING_RULE'
  | 'NO_OPEN_PERIOD'
  | 'NO_DEPARTMENT';

export interface PostSoToGlResult {
  voucherId: string | null;
  docNo: string | null;
  skipped: GlSkipReason | null;
  /** 本次結轉的銷貨成本（從庫存流水彙總而來）。 */
  cogs: PrismaNs.Decimal | null;
}

const SKIP = (r: GlSkipReason): PostSoToGlResult => ({
  voucherId: null,
  docNo: null,
  skipped: r,
  cogs: null,
});

/**
 * 銷貨單簽收完成時產生總帳分錄。
 * ⚠ 必須在 `postSoStockOut` 之後呼叫——銷貨成本是從它寫下的庫存流水彙總來的。
 */
export async function postSoToGl(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<PostSoToGlResult> {
  const { tenantId, soId } = p;

  // ── 冪等：同一張銷貨單只過一次帳 ──
  const dup = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: 'SO', sourceDocId: soId },
    select: { id: true, docNo: true },
  });
  if (dup) return { voucherId: dup.id, docNo: dup.docNo, skipped: 'ALREADY_POSTED', cogs: null };

  const so = await tx.nx04So.findFirst({
    where: { id: soId, tenantId },
    select: {
      docNo: true,
      soDate: true,
      customerId: true,
      billingPartnerId: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      salesPersonId: true,
    },
  });
  if (!so) return SKIP('SO_NOT_FOUND');

  // ── 安全閘 1：租戶套過帳規則了嗎 ──
  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: 'SO-CR', status: 'ACTIVE', isActive: true },
    select: { id: true },
  });
  if (!rule) return SKIP('NO_POSTING_RULE');

  // ── 安全閘 2：該日期有開帳中的會計期間嗎（＝總帳啟用了嗎）──
  const period = await tx.nx05FiscalPeriod.findFirst({
    where: {
      tenantId,
      startDate: { lte: so.soDate },
      endDate: { gte: so.soDate },
      status: 'OPEN',
    },
    select: { id: true },
  });
  if (!period) return SKIP('NO_OPEN_PERIOD');

  // ── 成本中心 ──
  // ⚠ 目前取「業務員所屬部門」。
  // 🔴 這是暫時解、需要執行長拍板：會計政策第 11 項是「不分攤、看店的貢獻」，
  //    所以成本中心的正解應該是**據點（店）**，而不是業務員的人資部門。
  //    但目前 nx01_site 沒有對應到 nx01_department，缺一條關聯。→ 已列報回報。
  let departmentId: string | null = null;
  if (so.salesPersonId) {
    const u = await tx.nx01User.findFirst({
      where: { id: so.salesPersonId, tenantId },
      select: { departmentId: true },
    });
    departmentId = u?.departmentId ?? null;
  }
  if (!departmentId) return SKIP('NO_DEPARTMENT');

  // ── 銷貨成本：從庫存流水彙總（postSoStockOut 已寫入）──
  const cogsAgg = await tx.nx03StockLedger.aggregate({
    where: { tenantId, sourceDocType: 'S', sourceDocId: soId, movementType: 'O' },
    _sum: { totalCost: true },
  });
  const cogs = new PrismaNs.Decimal(cogsAgg._sum.totalCost ?? 0);

  // ⚠ 成本為 0 是合法的（整新品與不良品在本系統的成本本來就是 0）——
  //   SO-CR 的結轉成本兩行標了條件性，金額 0 時自動不出現。
  const r = await postByRule(tx, {
    tenantId,
    actorUserId: p.userId,
    ruleCode: 'SO-CR',
    voucherDate: so.soDate,
    orgCode: orgFromDocNo(so.docNo),
    source: { docType: 'SO', docId: soId, docNo: so.docNo },
    origin: 'AUTO',
    summary: `銷貨 ${so.docNo}`,
    amounts: {
      GROSS: new PrismaNs.Decimal(so.totalAmount),
      NET: new PrismaNs.Decimal(so.subtotal),
      TAX: new PrismaNs.Decimal(so.taxAmount),
      COST: cogs,
    },
    dimensions: {
      departmentId,
      // 帳款對象可以不等於出貨客戶（偉盟實務：多據點各自開票）
      partnerId: so.billingPartnerId ?? so.customerId,
    },
  });

  return { voucherId: r.voucherId, docNo: r.docNo, skipped: null, cogs };
}

/** 從單號取機構碼（第三段）；取不到用 HQ0。 */
function orgFromDocNo(docNo: string): string {
  const parts = docNo.split('-');
  return parts.length >= 3 ? parts[2]! : 'HQ0';
}
