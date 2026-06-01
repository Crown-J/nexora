// apps/nx-api/src/platform-tenants/services/platform-tenants.service.ts
// 平台層 vs 租戶層分離軌 Phase 4：平台後台「客戶列表/詳情」service
//
// 設計重點：
// - 跟既有 /nx99/tenants（RolesGuard）並存、不互相覆蓋
// - 預設過濾：排除 SYSTEM（NX99TANT0000000）、INNOVA 過渡期租戶（NX99TANT0000001）
//   只列「真實客戶租戶 + 測試租戶（驗收期保留）」
// - 不做寫操作（list / getById）、訂閱管理留 Phase 5+

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import type { ListTenantsQueryDto } from '../dto/list-tenants.dto';

const SYSTEM_TENANT_IDS_EXCLUDED = ['NX99TANT0000000', 'NX99TANT0000001'];

@Injectable()
export class PlatformTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTenantsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      id: { notIn: SYSTEM_TENANT_IDS_EXCLUDED },
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { taxId: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.nx99Tenant.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          nameEn: true,
          status: true,
          isActive: true,
          taxId: true,
          phone: true,
          planCode: true,
          contactName: true,
          contactEmail: true,
          createdAt: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.nx99Tenant.count({ where }),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    if (SYSTEM_TENANT_IDS_EXCLUDED.includes(id)) {
      throw new NotFoundException(`Tenant ${id} not accessible from platform console`);
    }
    const tenant = await this.prisma.nx99Tenant.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        nameEn: true,
        status: true,
        isActive: true,
        taxId: true,
        address: true,
        phone: true,
        logoUrl: true,
        planCode: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        dataStartDate: true,
        importWizardCompletedAt: true,
        creditOverdueDaysThreshold: true,
        remark: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    // 帶活動訂閱（如有）
    const subscription = await this.prisma.nx99Subscription.findFirst({
      where: { tenantId: id, status: 'A' },
      include: { plan: { select: { code: true, name: true } } },
    });

    // 計算員工數（nx01_user 啟用中）
    const userCount = await this.prisma.nx01User.count({
      where: { tenantId: id, isActive: true },
    });

    return {
      ...tenant,
      subscription: subscription
        ? {
            id: subscription.id,
            planCode: subscription.plan.code,
            planName: subscription.plan.name,
            seats: subscription.seats,
            startAt: subscription.startAt,
            endAt: subscription.endAt,
            status: subscription.status,
          }
        : null,
      stats: {
        userCount,
      },
    };
  }
}
