import { BadRequestException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

/** 租戶範圍 API：JWT 必須帶 tenantId（種子租戶 admin 皆符合） */
export function requireTenantId(user: RequestUser): string {
  if (!user.tenantId) {
    throw new BadRequestException('tenantId missing in token');
  }
  return user.tenantId;
}
