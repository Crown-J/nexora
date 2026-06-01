// apps/nx-api/src/shared/nx05/nx05-apply-settlements.ts
// v1.2 階段 F P5 B：paylog → settlement → AR/AP 自動沖銷共用 helper
//
// 業務語意（總經理 2026-06-01 拍板①）：
//   - 一筆收/付款（paylog）可沖多筆 AR 或多筆 AP
//   - 一筆 settlement 必擇一 AR 或 AP（DB check constraint 強制）
//   - 沖銷時更新對應 AR/AP 的 paidAmount + balanceAmount + status

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

export type SettlementInput = {
  arId?: string | null;
  apId?: string | null;
  settledAmount: PrismaNs.Decimal | number | string;
  remark?: string | null;
};

/** 算結算後狀態（OPEN / PARTIAL / PAID） */
function recomputeArStatus(originalAmount: PrismaNs.Decimal, paidAmount: PrismaNs.Decimal): string {
  if (paidAmount.gte(originalAmount)) return 'PAID';
  if (paidAmount.gt(0)) return 'PARTIAL';
  return 'OPEN';
}

function recomputeApStatus(originalAmount: PrismaNs.Decimal, paidAmount: PrismaNs.Decimal): string {
  if (paidAmount.gte(originalAmount)) return 'PAID';
  if (paidAmount.gt(0)) return 'PARTIAL';
  return 'OPEN';
}

/**
 * 為一筆 paylog 寫入多筆 settlement、自動更新對應 AR/AP 餘額。
 *
 * 回傳建立的 settlement 數。
 */
export async function applySettlementsForPaylog(
  tx: Prisma.TransactionClient,
  p: {
    tenantId: string;
    paylogId: string;
    userId: string;
    settlements: SettlementInput[];
  },
): Promise<number> {
  let created = 0;
  for (const s of p.settlements) {
    if ((!s.arId && !s.apId) || (s.arId && s.apId)) {
      throw new BadRequestException('每筆 settlement 必擇一 arId 或 apId（不可同時、不可同空）');
    }
    const amt = new PrismaNs.Decimal(s.settledAmount);
    if (amt.lte(0)) {
      throw new BadRequestException('settledAmount 必須 > 0');
    }
    if (s.arId) {
      // 沖 AR
      const ar = await tx.nx05ArLedger.findFirst({
        where: { id: s.arId, tenantId: p.tenantId },
        select: { originalAmount: true, paidAmount: true, balanceAmount: true },
      });
      if (!ar) throw new NotFoundException(`AR ${s.arId} 不存在`);
      const original = new PrismaNs.Decimal(ar.originalAmount);
      const prevPaid = new PrismaNs.Decimal(ar.paidAmount);
      const nextPaid = prevPaid.plus(amt);
      if (nextPaid.gt(original)) {
        throw new BadRequestException(
          `沖銷金額超過 AR 餘額（既有 ${ar.balanceAmount.toString()}、嘗試沖 ${amt.toString()}）`,
        );
      }
      const nextBalance = original.minus(nextPaid);
      await tx.nx05ArLedger.update({
        where: { id: s.arId },
        data: {
          paidAmount: nextPaid,
          balanceAmount: nextBalance,
          status: recomputeArStatus(original, nextPaid),
          updatedBy: p.userId,
        },
      });
    } else if (s.apId) {
      const ap = await tx.nx05ApLedger.findFirst({
        where: { id: s.apId, tenantId: p.tenantId },
        select: { originalAmount: true, paidAmount: true, balanceAmount: true },
      });
      if (!ap) throw new NotFoundException(`AP ${s.apId} 不存在`);
      const original = new PrismaNs.Decimal(ap.originalAmount);
      const prevPaid = new PrismaNs.Decimal(ap.paidAmount);
      const nextPaid = prevPaid.plus(amt);
      if (nextPaid.gt(original)) {
        throw new BadRequestException(
          `沖銷金額超過 AP 餘額（既有 ${ap.balanceAmount.toString()}、嘗試沖 ${amt.toString()}）`,
        );
      }
      const nextBalance = original.minus(nextPaid);
      await tx.nx05ApLedger.update({
        where: { id: s.apId },
        data: {
          paidAmount: nextPaid,
          balanceAmount: nextBalance,
          status: recomputeApStatus(original, nextPaid),
          updatedBy: p.userId,
        },
      });
    }

    await tx.nx05PaylogSettlement.create({
      data: {
        tenantId: p.tenantId,
        paylogId: p.paylogId,
        arId: s.arId ?? null,
        apId: s.apId ?? null,
        settledAmount: amt,
        remark: s.remark?.trim() || null,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
    created++;
  }
  return created;
}
