import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

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
   */
  async list(user: RequestUser, query: ListFeatureFlagsQueryDto) {
    const tenantId = this.resolveTargetTenantId(user, query);

    const tenant = await this.prisma.nx99Tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, code: true, isActive: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const sub = await this.prisma.nx99Subscription.findFirst({
      where: { tenantId, status: 'A' },
      include: {
        plan: true,
        rev_Nx99SubscriptionItem_subscriptionId: {
          where: { status: 'A', itemType: 'M' },
        },
      },
    });

    const planCode = sub?.plan?.code ?? null;
    const productModuleIds = new Set<string>();

    if (planCode) {
      const planModules = await this.prisma.nx99ProductModule.findMany({
        where: { isActive: true, applicablePlanCode: planCode },
        select: { id: true },
      });
      for (const m of planModules) productModuleIds.add(m.id);
    }

    for (const it of sub?.rev_Nx99SubscriptionItem_subscriptionId ?? []) {
      productModuleIds.add(it.refId);
    }

    if (productModuleIds.size === 0) {
      return {
        tenant_id: tenantId,
        plan_code: planCode,
        flags: [] as { app_module_code: string; enabled: boolean; product_module_id: string; product_module_code: string; name: string }[],
      };
    }

    const modules = await this.prisma.nx99ProductModule.findMany({
      where: { id: { in: [...productModuleIds] }, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        moduleLevel: true,
        applicablePlanCode: true,
        rev_Nx99ProductModuleMap_productModuleId: {
          select: { appModuleCode: true, isRequired: true },
        },
      },
    });

    const flags: {
      app_module_code: string;
      enabled: boolean;
      product_module_id: string;
      product_module_code: string;
      name: string;
      module_level: string;
      applicable_plan_code: string;
      is_required: boolean;
    }[] = [];

    const seen = new Set<string>();
    for (const m of modules) {
      for (const map of m.rev_Nx99ProductModuleMap_productModuleId) {
        const code = map.appModuleCode?.trim();
        if (!code) continue;
        const key = `${m.id}:${code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        flags.push({
          app_module_code: code,
          enabled: true,
          product_module_id: m.id,
          product_module_code: m.code,
          name: m.name,
          module_level: m.moduleLevel,
          applicable_plan_code: m.applicablePlanCode,
          is_required: map.isRequired,
        });
      }
    }

    flags.sort((a, b) => a.app_module_code.localeCompare(b.app_module_code));

    return {
      tenant_id: tenantId,
      plan_code: planCode,
      flags,
    };
  }
}
