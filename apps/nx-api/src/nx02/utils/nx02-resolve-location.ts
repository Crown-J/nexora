/**
 * File: apps/nx-api/src/nx02/utils/nx02-resolve-location.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-CORE-UTL-003：解析台帳必填之 location_id（明細可空時取倉庫預設庫位）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-CORE-UTL-003-F01
 */

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';

/**
 * @FUNCTION_CODE NX02-CORE-UTL-003-F01
 */
export async function resolveLedgerLocationId(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseId: string,
  preferredLocationId?: string | null,
): Promise<string> {
  if (preferredLocationId?.trim()) {
    const loc = await tx.nx00Location.findFirst({
      where: {
        id: preferredLocationId.trim(),
        tenantId,
        warehouseId,
        isActive: true,
      },
      select: { id: true },
    });
    if (loc) return loc.id;
  }
  const def = await tx.nx00Location.findFirst({
    where: { tenantId, warehouseId, isActive: true },
    orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
    select: { id: true },
  });
  if (!def) {
    throw new BadRequestException('此倉庫無可用庫位，請先在主檔建立庫位');
  }
  return def.id;
}
