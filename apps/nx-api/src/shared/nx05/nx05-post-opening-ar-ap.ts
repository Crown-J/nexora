// apps/nx-api/src/shared/nx05/nx05-post-opening-ar-ap.ts
// ⭐ 總帳脊椎 C7：期初應收／期初應付開帳（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §14「期初開帳」
//
// 🔴 為什麼要做：總帳上線之前就存在的應收應付，背後沒有可以觸發分錄的營運事件——
//   跟期初存貨是同一個問題。對帳表的應收那一項現在差的就是這些。
//
// ⭐ 行為與期初存貨開帳一致（`nx05-post-opening-inventory.ts`）：
//   這是**人明確按下去的一次性動作**，有問題就大聲報錯、⛔ 不悄悄跳過；過帳後不可逆。
//
// 🔴 每個往來對象一張傳票。理由不是為了好看——**應收應付本來就是掛在對象身上的**，
//   全部壓成一張總數，開帳第一天就失去「誰欠誰多少」這件事，那正是要記帳的原因。
//
// 🔴 金額怎麼算：**開帳日當天的未收／未付餘額**
//     ＝ 開帳日（含）以前建立的單據餘額 ＋ 開帳日之後才發生的收付款
//   ⭐ 加回去那一段是關鍵：餘額欄已經被之後的收付款扣過了，
//      但那些收付款自己會有各自的傳票，不能在期初重複扣一次。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { postByRule } from './nx05-post-by-rule';

type Dec = PrismaNs.Decimal;
const D0 = new PrismaNs.Decimal(0);

export interface OpeningPartnerLine {
  partnerId: string;
  partnerName: string;
  /** 客戶應收（1111）。應付開帳時恆為 0。 */
  tradeAmount: Dec;
  /** 廠商退款應收（1113）。應付開帳時恆為 0。 */
  otherAmount: Dec;
  amount: Dec;
  voucherId: string;
  voucherDocNo: string;
}

export interface OpeningArApResult {
  kind: 'AR' | 'AP';
  totalAmount: Dec;
  lines: OpeningPartnerLine[];
}

async function assertReady(
  tx: Prisma.TransactionClient,
  tenantId: string,
  ruleCode: string,
  openingDate: Date,
  label: string,
): Promise<void> {
  const done = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: ruleCode === 'OPEN-RCV' ? 'OPEN-AR' : 'OPEN-AP2' },
    select: { docNo: true },
  });
  if (done) {
    throw new BadRequestException(
      `${label}開帳已經做過了（傳票 ${done.docNo}）。⛔ 不可以再做一次——` +
        '那會讓餘額憑空多一倍。要修正只能對原傳票做紅字沖銷',
    );
  }
  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: ruleCode, status: 'ACTIVE', isActive: true },
    select: { id: true },
  });
  if (!rule) {
    throw new BadRequestException(
      `${label}開帳失敗：找不到啟用中的交易代號 ${ruleCode}。請先套用過帳規則`,
    );
  }
  const period = await tx.nx05FiscalPeriod.findFirst({
    where: { tenantId, startDate: { lte: openingDate }, endDate: { gte: openingDate }, status: 'OPEN' },
    select: { code: true },
  });
  if (!period) {
    const ymd = openingDate.toISOString().slice(0, 10);
    throw new BadRequestException(
      `${label}開帳失敗：${ymd} 沒有開帳中的會計期間。請先建立該期間並設為開帳中`,
    );
  }
}

/** 把「哪幾行要跳過」轉成 postByRule 的行覆寫。 */
function buildSkips(flags: Record<number, boolean>): Record<number, { skip: true }> {
  const out: Record<number, { skip: true }> = {};
  for (const [lineNo, skip] of Object.entries(flags)) {
    if (skip) out[Number(lineNo)] = { skip: true };
  }
  return out;
}

async function partnerNames(
  tx: Prisma.TransactionClient,
  tenantId: string,
  ids: string[],
): Promise<Map<string, string>> {
  const rows = await tx.nx01Partner.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * ⭐ 期初應收開帳：把開帳日當天客戶還欠的錢做成開帳分錄。
 * 借方分兩格——客戶欠的貨款走應收帳款、廠商該退我方的錢走其他應收款。
 */
export async function postOpeningReceivable(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; openingDate: Date; userId: string },
): Promise<OpeningArApResult> {
  const { tenantId, openingDate } = p;
  await assertReady(tx, tenantId, 'OPEN-RCV', openingDate, '期初應收');

  const ars = await tx.nx05ArLedger.findMany({
    where: {
      tenantId,
      status: { notIn: ['WRITTEN_OFF'] },
      arDate: { lte: openingDate },
    },
    select: { id: true, customerId: true, sourceType: true, balanceAmount: true },
  });
  if (ars.length === 0) {
    throw new BadRequestException(
      '期初應收開帳失敗：開帳日當天沒有任何未收款的應收單，沒有東西可以開帳',
    );
  }

  // 開帳日之後才發生的收款：餘額欄已經扣過了，期初要加回去（那些收款自己會有傳票）
  const laterReceipts = await tx.nx05Paylog.groupBy({
    by: ['arId'],
    where: {
      tenantId,
      payType: 'CR',
      status: 'POSTED',
      payDate: { gt: openingDate },
      arId: { in: ars.map((a) => a.id) },
    },
    _sum: { amount: true },
  });
  const addBack = new Map(
    laterReceipts.map((g) => [g.arId ?? '', new PrismaNs.Decimal(g._sum.amount ?? 0)]),
  );

  const byPartner = new Map<string, { trade: Dec; other: Dec }>();
  for (const ar of ars) {
    const amount = new PrismaNs.Decimal(ar.balanceAmount).add(addBack.get(ar.id) ?? D0);
    if (amount.lte(0)) continue;
    const cur = byPartner.get(ar.customerId) ?? { trade: D0, other: D0 };
    // 🔴 進貨退出建的是「廠商該退我方的錢」，跟客戶欠的貨款不是同一件事、也不是同一個科目
    if (ar.sourceType === 'PR') cur.other = cur.other.add(amount);
    else cur.trade = cur.trade.add(amount);
    byPartner.set(ar.customerId, cur);
  }
  if (byPartner.size === 0) {
    throw new BadRequestException('期初應收開帳失敗：算出來的期初應收全部是 0，沒有東西可以開帳');
  }

  const names = await partnerNames(tx, tenantId, [...byPartner.keys()]);
  const lines: OpeningPartnerLine[] = [];
  let total = D0;
  for (const [partnerId, v] of [...byPartner.entries()].sort()) {
    const amount = v.trade.add(v.other);
    if (amount.isZero()) continue;
    const name = names.get(partnerId) ?? partnerId;
    const r = await postByRule(tx, {
      tenantId,
      actorUserId: p.userId,
      ruleCode: 'OPEN-RCV',
      voucherDate: openingDate,
      source: { docType: 'OPEN-AR', docId: partnerId, docNo: `OPEN-AR-${name}` },
      origin: 'BATCH',
      summary: `期初應收開帳 ${name}`,
      amounts: { AR_TRADE: v.trade, AR_OTHER: v.other, AMOUNT: amount },
      dimensions: { partnerId },
      lineOverrides: buildSkips({ 1: v.trade.isZero(), 2: v.other.isZero() }),
    });
    lines.push({
      partnerId,
      partnerName: name,
      tradeAmount: v.trade,
      otherAmount: v.other,
      amount,
      voucherId: r.voucherId,
      voucherDocNo: r.docNo,
    });
    total = total.add(amount);
  }

  return { kind: 'AR', totalAmount: total, lines };
}

/** ⭐ 期初應付開帳：把開帳日當天我方還欠廠商的錢做成開帳分錄。 */
export async function postOpeningPayable(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; openingDate: Date; userId: string },
): Promise<OpeningArApResult> {
  const { tenantId, openingDate } = p;
  await assertReady(tx, tenantId, 'OPEN-PAY', openingDate, '期初應付');

  const aps = await tx.nx05ApLedger.findMany({
    where: { tenantId, status: { notIn: ['VOID'] }, apDate: { lte: openingDate } },
    select: { id: true, supplierId: true, billToPartnerId: true, balanceAmount: true },
  });
  if (aps.length === 0) {
    throw new BadRequestException(
      '期初應付開帳失敗：開帳日當天沒有任何未付款的應付單，沒有東西可以開帳',
    );
  }

  const laterPayments = await tx.nx05Paylog.groupBy({
    by: ['apId'],
    where: {
      tenantId,
      payType: 'CP',
      status: 'POSTED',
      payDate: { gt: openingDate },
      apId: { in: aps.map((a) => a.id) },
    },
    _sum: { amount: true },
  });
  const addBack = new Map(
    laterPayments.map((g) => [g.apId ?? '', new PrismaNs.Decimal(g._sum.amount ?? 0)]),
  );

  const byPartner = new Map<string, Dec>();
  for (const ap of aps) {
    const amount = new PrismaNs.Decimal(ap.balanceAmount).add(addBack.get(ap.id) ?? D0);
    if (amount.lte(0)) continue;
    // 帳款對象可以不等於供應商（直送鏈：收貨方≠付款方）
    const key = ap.billToPartnerId ?? ap.supplierId;
    byPartner.set(key, (byPartner.get(key) ?? D0).add(amount));
  }
  if (byPartner.size === 0) {
    throw new BadRequestException('期初應付開帳失敗：算出來的期初應付全部是 0，沒有東西可以開帳');
  }

  const names = await partnerNames(tx, tenantId, [...byPartner.keys()]);
  const lines: OpeningPartnerLine[] = [];
  let total = D0;
  for (const [partnerId, amount] of [...byPartner.entries()].sort()) {
    if (amount.isZero()) continue;
    const name = names.get(partnerId) ?? partnerId;
    const r = await postByRule(tx, {
      tenantId,
      actorUserId: p.userId,
      ruleCode: 'OPEN-PAY',
      voucherDate: openingDate,
      source: { docType: 'OPEN-AP2', docId: partnerId, docNo: `OPEN-AP-${name}` },
      origin: 'BATCH',
      summary: `期初應付開帳 ${name}`,
      amounts: { AMOUNT: amount },
      dimensions: { partnerId },
    });
    lines.push({
      partnerId,
      partnerName: name,
      tradeAmount: D0,
      otherAmount: D0,
      amount,
      voucherId: r.voucherId,
      voucherDocNo: r.docNo,
    });
    total = total.add(amount);
  }

  return { kind: 'AP', totalAmount: total, lines };
}
