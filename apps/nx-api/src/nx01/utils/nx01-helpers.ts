/**
 * File: apps/nx-api/src/nx01/utils/nx01-helpers.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-CORE-UTL-010：日期／金額／稅額共用工具
 *
 * @FUNCTION_CODE NX01-CORE-UTL-010-F01
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from 'db-core';

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F01
 */
export function d(v: number | string): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F02
 */
export function roundMoney2(x: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(x.toFixed(2, Prisma.Decimal.ROUND_HALF_UP));
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F03
 */
export function parseYmd(s: string): Date {
  const t = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) throw new BadRequestException('date must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F04
 */
export function movementDateFromDocDate(docDate: Date): Date {
  return new Date(
    Date.UTC(
      docDate.getUTCFullYear(),
      docDate.getUTCMonth(),
      docDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F05
 */
export function lineAmountFromQtyCost(qty: Prisma.Decimal, unitCost: Prisma.Decimal): Prisma.Decimal {
  return roundMoney2(qty.mul(unitCost));
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F06
 */
export function calcHeaderTax(
  subtotal: Prisma.Decimal,
  taxRate: Prisma.Decimal,
  taxAmountOverride: Prisma.Decimal | null | undefined,
): { taxAmount: Prisma.Decimal; totalAmount: Prisma.Decimal } {
  const taxAmount =
    taxAmountOverride != null
      ? roundMoney2(taxAmountOverride)
      : roundMoney2(subtotal.mul(taxRate).div(d(100)));
  const totalAmount = roundMoney2(subtotal.add(taxAmount));
  return { taxAmount, totalAmount };
}

/**
 * @FUNCTION_CODE NX01-CORE-UTL-010-F07
 */
export async function resolveTwdCurrencyId(
  db: Pick<Prisma.TransactionClient, 'nx00Currency'>,
): Promise<string> {
  const twd = await db.nx00Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
  if (!twd) throw new BadRequestException('系統缺少 TWD 幣別');
  return twd.id;
}
