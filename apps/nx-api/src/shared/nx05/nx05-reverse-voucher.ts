// apps/nx-api/src/shared/nx05/nx05-reverse-voucher.ts
// ⭐ 總帳脊椎 B3：紅字沖銷（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.2 §4
//
// 上位原則②：過帳當下不可逆，過帳後要修正只能走沖銷／紅字。
//   → 已過帳的傳票永遠不會被刪、也不會被改金額；修正的方式是「再開一張方向相反的傳票」。
//
// 🔴🔴 一個會影響帳正確性的語意判斷（實作時定案、與規格 §1 的措辭對齊如下）：
//   原傳票被沖銷後，狀態**維持 POSTED**，不改成 VOIDED。
//   理由：原分錄與沖銷分錄**兩張都在帳上**、兩者相抵為零，這才是紅字沖銷的定義。
//   若把原傳票改成 VOIDED，任何一支「只取 status='POSTED'」的查詢就會**只看到沖銷那一張**，
//   帳面憑空少掉原始金額——這是最難查的一種錯。
//   → 「這張已被沖銷」不是用狀態表示，是用「有沒有一張傳票的 reversal_of_voucher_id 指著它」表示。
//   → `VOIDED` 專門留給「DRAFT 傳票在過帳前被作廢」（見本檔 discardDraftVoucher）。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo } from './nx05-doc-no';
import { applyToGlBalance, resolveOpenPeriod } from './nx05-post-by-rule';

type Dec = PrismaNs.Decimal;

export interface ReverseVoucherInput {
  tenantId: string;
  actorUserId: string;
  /** 要被沖銷的原傳票 ID。 */
  voucherId: string;
  /** 沖銷原因（必填、永久保存作稽核依據）。 */
  reason: string;
  /**
   * 沖銷傳票的日期。預設沿用原傳票日期。
   * ⚠ 原傳票那一期若已關帳，必須指定一個落在「開帳中」期間的日期——
   *    已關帳的期間不得再寫入任何傳票，沖銷也不例外。
   */
  reversalDate?: Date;
  orgCode?: string;
}

export interface ReverseVoucherResult {
  reversalVoucherId: string;
  docNo: string;
  lineCount: number;
  totalDebit: Dec;
  totalCredit: Dec;
  periodCode: string;
}

/** 借貸對調。 */
function flip(drCr: string): string {
  return drCr === 'D' ? 'C' : 'D';
}

/**
 * ⭐ 紅字沖銷：產生一張與原傳票方向相反、金額相同的新傳票。
 * 整支在呼叫端的 transaction 內執行。
 */
export async function reverseVoucher(
  tx: Prisma.TransactionClient,
  input: ReverseVoucherInput,
): Promise<ReverseVoucherResult> {
  const { tenantId, actorUserId, voucherId } = input;

  const reason = input.reason?.trim();
  if (!reason) {
    throw new BadRequestException('沖銷失敗：必須填寫沖銷原因（永久保存作稽核依據）');
  }

  // ── 1) 原傳票 ──
  const origin = await tx.nx05Voucher.findFirst({
    where: { id: voucherId, tenantId },
    select: {
      id: true,
      docNo: true,
      voucherDate: true,
      status: true,
      postingRuleId: true,
      sourceDocType: true,
      sourceDocId: true,
      sourceDocNo: true,
      reversalOfVoucherId: true,
      summary: true,
    },
  });
  if (!origin) throw new BadRequestException(`沖銷失敗：找不到傳票 ${voucherId}`);

  if (origin.status === 'DRAFT') {
    throw new BadRequestException(
      `沖銷失敗：傳票 ${origin.docNo} 尚未過帳（DRAFT）。未過帳的傳票請走作廢（discard），不是沖銷`,
    );
  }
  if (origin.status === 'VOIDED') {
    throw new BadRequestException(`沖銷失敗：傳票 ${origin.docNo} 已作廢，不需沖銷`);
  }
  if (origin.reversalOfVoucherId) {
    throw new BadRequestException(
      `沖銷失敗：傳票 ${origin.docNo} 本身就是一張沖銷傳票，不可再被沖銷。` +
        `要更正請直接開立正確的新傳票`,
    );
  }

  // 已被沖銷過？（DB 的 @@unique 也擋得住，但先查一次才能給得出看得懂的訊息）
  const already = await tx.nx05Voucher.findFirst({
    where: { tenantId, reversalOfVoucherId: origin.id },
    select: { docNo: true },
  });
  if (already) {
    throw new BadRequestException(
      `沖銷失敗：傳票 ${origin.docNo} 已於 ${already.docNo} 沖銷過，一張傳票只能被沖銷一次`,
    );
  }

  // ── 2) 關帳硬閘（與過帳共用同一道）──
  const reversalDate = input.reversalDate ?? origin.voucherDate;
  let period: { id: string; code: string };
  try {
    period = await resolveOpenPeriod(tx, tenantId, reversalDate);
  } catch (e) {
    if (!input.reversalDate && e instanceof Error && e.message.includes('已關帳')) {
      throw new BadRequestException(
        `沖銷失敗：原傳票 ${origin.docNo} 所屬期間已關帳，沖銷分錄不能寫回已關帳的期間。` +
          `請指定 reversalDate 為一個開帳中期間的日期（通常是當期）`,
      );
    }
    throw e;
  }

  // ── 3) 原分錄 ──
  const lines = await tx.nx05VoucherLine.findMany({
    where: { voucherId: origin.id },
    orderBy: { lineNo: 'asc' },
  });
  if (lines.length === 0) {
    throw new BadRequestException(`沖銷失敗：傳票 ${origin.docNo} 沒有分錄行`);
  }

  let totalDebit = new PrismaNs.Decimal(0);
  let totalCredit = new PrismaNs.Decimal(0);
  for (const l of lines) {
    const amt = new PrismaNs.Decimal(l.amount);
    // 方向對調後再累計
    if (flip(l.drCr) === 'D') totalDebit = totalDebit.add(amt);
    else totalCredit = totalCredit.add(amt);
  }
  if (!totalDebit.equals(totalCredit)) {
    // 原傳票過帳時就驗過平衡；走到這裡代表資料被外力改過
    throw new BadRequestException(
      `沖銷失敗：原傳票 ${origin.docNo} 借貸不平衡（借 ${totalDebit} / 貸 ${totalCredit}），` +
        `資料可能已被直接改過，請先查明`,
    );
  }

  // ── 4) 沖銷傳票 ──
  const docNo = await allocNx05DocNo(tx, tenantId, 'JV', input.orgCode ?? 'HQ0');
  const reversal = await tx.nx05Voucher.create({
    data: {
      tenantId,
      docNo,
      voucherDate: reversalDate,
      fiscalPeriodId: period.id,
      // 沿用原規則與原來源單據，讓「查這張單的所有分錄」一次看得到正反兩張
      postingRuleId: origin.postingRuleId,
      sourceDocType: origin.sourceDocType,
      sourceDocId: origin.sourceDocId,
      sourceDocNo: origin.sourceDocNo,
      origin: 'MANUAL',
      summary: `沖銷 ${origin.docNo}${origin.summary ? `（${origin.summary}）` : ''}`,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      postedAt: new Date(),
      postedBy: actorUserId,
      reversalOfVoucherId: origin.id,
      voidReason: reason,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    select: { id: true },
  });

  await tx.nx05VoucherLine.createMany({
    data: lines.map((l) => ({
      tenantId,
      voucherId: reversal.id,
      lineNo: l.lineNo,
      drCr: flip(l.drCr),
      accountCodeId: l.accountCodeId,
      amount: l.amount,
      departmentId: l.departmentId,
      partnerId: l.partnerId,
      employeeUserId: l.employeeUserId,
      bankAccountId: l.bankAccountId,
      taxCodeId: l.taxCodeId,
      summary: l.summary ? `沖銷：${l.summary}` : `沖銷 ${origin.docNo}`,
      postingRuleLineId: l.postingRuleLineId,
      sourceDocItemId: l.sourceDocItemId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })),
  });

  // ── 5) 科目餘額 ──
  // ⚠ 借貸各自累加、不相減：試算表要看得到「本期借方合計 / 貸方合計」的原始數字，
  //    沖銷才會是「看得見的一筆」而不是把原始數字擦掉。
  await applyToGlBalance(tx, {
    tenantId,
    actorUserId,
    fiscalPeriodId: period.id,
    lines: lines.map((l) => ({
      accountCodeId: l.accountCodeId,
      departmentId: l.departmentId,
      drCr: flip(l.drCr),
      amount: new PrismaNs.Decimal(l.amount),
    })),
  });

  // 🔴 原傳票狀態刻意不動（維持 POSTED）——理由見檔頭。

  return {
    reversalVoucherId: reversal.id,
    docNo,
    lineCount: lines.length,
    totalDebit,
    totalCredit,
    periodCode: period.code,
  };
}

/**
 * DRAFT 傳票作廢（尚未過帳、沒進過帳的東西、不需要沖銷）。
 * ⚠ 這才是 `VOIDED` 的意思——不是「已被沖銷」。
 */
export async function discardDraftVoucher(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; actorUserId: string; voucherId: string; reason: string },
): Promise<void> {
  const reason = p.reason?.trim();
  if (!reason) throw new BadRequestException('作廢失敗：必須填寫作廢原因');

  const v = await tx.nx05Voucher.findFirst({
    where: { id: p.voucherId, tenantId: p.tenantId },
    select: { id: true, docNo: true, status: true },
  });
  if (!v) throw new BadRequestException(`作廢失敗：找不到傳票 ${p.voucherId}`);
  if (v.status === 'POSTED') {
    throw new BadRequestException(
      `作廢失敗：傳票 ${v.docNo} 已過帳，不可作廢。已過帳的傳票只能走紅字沖銷`,
    );
  }
  if (v.status === 'VOIDED') return; // 冪等

  await tx.nx05Voucher.update({
    where: { id: v.id },
    data: { status: 'VOIDED', voidReason: reason, updatedBy: p.actorUserId },
  });
}

/**
 * 這張傳票被沖銷了嗎？
 * ⚠ 「已被沖銷」不看狀態、看有沒有一張傳票指著它——理由見檔頭。
 */
export async function findReversalOf(
  tx: Prisma.TransactionClient,
  tenantId: string,
  voucherId: string,
): Promise<{ id: string; docNo: string } | null> {
  return tx.nx05Voucher.findFirst({
    where: { tenantId, reversalOfVoucherId: voucherId },
    select: { id: true, docNo: true },
  });
}
