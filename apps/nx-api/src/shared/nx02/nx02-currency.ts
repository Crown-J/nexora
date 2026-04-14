import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';

/** nx01_currency.id 為 VARCHAR(15)；DTO 常傳 TWD/USD 等 code，在此解析為 FK id。 */
export async function resolveCurrencyId(
  tx: Prisma.TransactionClient,
  codeOrId?: string | null,
): Promise<string> {
  const raw = (codeOrId ?? 'TWD').trim();
  if (raw.length >= 12) {
    const byId = await tx.nx01Currency.findFirst({ where: { id: raw }, select: { id: true } });
    if (byId) return byId.id;
  }
  const byCode = await tx.nx01Currency.findFirst({
    where: { code: raw, isActive: true },
    select: { id: true },
  });
  if (!byCode) throw new BadRequestException(`Unknown or inactive currency: ${raw}`);
  return byCode.id;
}
