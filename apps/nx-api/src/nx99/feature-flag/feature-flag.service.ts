import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveEnabledModules } from '../../shared/module-access/resolve-enabled-modules';

import type { ListFeatureFlagsQueryDto } from './dto/feature-flag.dto';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTargetTenantId(user: RequestUser, query: ListFeatureFlagsQueryDto): string {
    const q = query.tenantId?.trim();
    // A042 closure：跨租戶查 feature-flag 限 SYSADMIN（NEXORA team）；OWNER 屬單租戶不跨
    const isAdmin = (user.roles ?? []).some((r) => String(r).trim().toUpperCase() === 'SYSADMIN');
    if (!user.tenantId) {
      if (!q) throw new BadRequestException('tenantId query is required');
      return q;
    }
    if (q && q !== user.tenantId && !isAdmin) {
      throw new ForbiddenException('Cannot query another tenant');
    }
    return q ?? user.tenantId;
  }

  /**
   * 以「方案標配模組」＋「訂閱明細（加購模組）」合併，對應 nx99_product_module_map 展開為 app_module_code。
   *
   * ⚠ 解析邏輯已抽到 shared/module-access/resolve-enabled-modules.ts，
   *   與 jwt.strategy（ModuleAccessGuard 的資料來源）共用**同一份實作**，避免兩處漂移。
   */
  async list(user: RequestUser, query: ListFeatureFlagsQueryDto) {
    const tenantId = this.resolveTargetTenantId(user, query);

    const tenant = await this.prisma.nx99Tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, code: true, isActive: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const { planCode, flags } = await resolveEnabledModules(this.prisma, tenantId);

    return {
      tenant_id: tenantId,
      plan_code: planCode,
      flags,
    };
  }
}
