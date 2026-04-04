/**
 * File: apps/nx-api/src/nx02/utils/assert-nx02-tenant.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02 租戶範圍：NX02 API 必須有 tenantId（平台跨租戶帳號不可查業務庫存）
 *
 * Notes:
 * - @FUNCTION_CODE NX02-CORE-UTL-001-F01
 */

import { ForbiddenException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

/**
 * @FUNCTION_CODE NX02-CORE-UTL-001-F01
 */
export function assertNx02TenantId(user: RequestUser | undefined): string {
  const tid = user?.tenantId ?? null;
  if (!tid) {
    throw new ForbiddenException('NX02 requires a tenant-scoped session');
  }
  return tid;
}
