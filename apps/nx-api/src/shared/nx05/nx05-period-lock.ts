import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import type { PrismaClient } from 'db-core';

function yearMonth(d: Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

/** 若該曆月已有 CLOSED 關帳紀錄，禁止變更該月單據。 */
export async function assertFinancePeriodMutable(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  docDate: Date,
): Promise<void> {
  const ym = yearMonth(docDate);
  const closings = await db.nx05Closing.findMany({
    where: { tenantId, status: 'CLOSED' },
    select: { closingDate: true },
  });
  for (const c of closings) {
    if (yearMonth(new Date(c.closingDate)) === ym) {
      throw new BadRequestException(`Accounting period ${ym} is closed; documents in this month cannot be modified.`);
    }
  }
}
