import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';

export async function requireDefaultLocationId(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseId: string,
): Promise<string> {
  const loc = await tx.nx01Location.findFirst({
    where: { tenantId, warehouseId, isActive: true },
    orderBy: { code: 'asc' },
    select: { id: true },
  });
  if (!loc) throw new BadRequestException(`No active location for warehouse ${warehouseId}`);
  return loc.id;
}
