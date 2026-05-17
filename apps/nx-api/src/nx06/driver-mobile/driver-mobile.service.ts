// apps/nx-api/src/nx06/driver-mobile/driver-mobile.service.ts
// NX06 DriverMobile service（外務員 PWA App 後端 API）
//
// 對齊：
//   - overview v0.2.0 §4.1 #4 外務員 PWA App
//   - Hank Q-H6：driver heartbeat 沿用既有 PATCH /nx06/delivery/:id/location
//
// 業務語意：
//   - listMyAssignedDns：當前 driver 名下所有非 terminal status 的 DN（按 routeOrderInSequence 排序）
//   - getMyDashboard：聚合 today task summary + pending handover + active route batch

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class DriverMobileService {
  constructor(private readonly prisma: PrismaService) {}

  /** 當前 driver 名下所有 active DN（按路線優化順序、否則 docNo 升序）。 */
  async listMyAssignedDns(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx06Dn.findMany({
      where: {
        tenantId,
        driverUserId: user.sub,
        status: { in: ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'CUSTOMS', 'ARRIVED'] },
      },
      orderBy: [
        { routeBatchId: 'asc' },
        { routeOrderInSequence: 'asc' },
        { docNo: 'asc' },
      ],
      select: {
        id: true,
        docNo: true,
        status: true,
        logisticsType: true,
        routeBatchId: true,
        routeOrderInSequence: true,
        estimatedDurationSec: true,
        lastLat: true,
        lastLng: true,
        lastLocationAt: true,
        rev_Nx06DnStop_dnId: {
          orderBy: { stopNo: 'asc' },
          select: {
            id: true,
            stopNo: true,
            address: true,
            contactName: true,
            contactPhone: true,
            status: true,
          },
        },
      },
    });
    return { ok: true, count: rows.length, rows };
  }

  /** 聚合 dashboard：今天 task 數 + 待 handover + active route batch。 */
  async getMyDashboard(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayActive, todayCompleted, pendingHandovers, activeBatch] = await Promise.all([
      this.prisma.nx06Dn.count({
        where: {
          tenantId,
          driverUserId: user.sub,
          status: { in: ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'CUSTOMS', 'ARRIVED'] },
        },
      }),
      this.prisma.nx06Dn.count({
        where: {
          tenantId,
          driverUserId: user.sub,
          status: { in: ['DELIVERED', 'PICKED_UP', 'COMPLETED'] },
          completedAt: { gte: todayStart },
        },
      }),
      this.prisma.nx06DnHandover.count({
        where: {
          tenantId,
          toDriverId: user.sub,
          status: 'SUGGESTED',
        },
      }),
      this.prisma.nx06Dn.findFirst({
        where: {
          tenantId,
          driverUserId: user.sub,
          routeBatchId: { not: null },
          status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
        },
        orderBy: { routeOrderInSequence: 'asc' },
        select: { routeBatchId: true },
      }),
    ]);

    return {
      ok: true,
      todayActive,
      todayCompleted,
      pendingHandovers,
      activeBatchId: activeBatch?.routeBatchId ?? null,
    };
  }
}
