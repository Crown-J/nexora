/**
 * File: apps/nx-api/src/nx01/dashboard/nx01-dashboard.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-DSH-SVC-001：採購首頁統計（RFQ／PO／RR／入庫／PR）
 *
 * @FUNCTION_CODE NX01-DSH-SVC-001-F01
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Nx01DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX01-DSH-SVC-001-F01
   */
  async stats(tenantId: string) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));

    const [
      rfqPending,
      rfqTotal,
      poPending,
      poTotal,
      rrPending,
      rrTotal,
      postedThisMonth,
      prInProgress,
    ] = await Promise.all([
      this.prisma.nx01Rfq.count({
        where: { tenantId, status: { in: ['D', 'S', 'R'] } },
      }),
      this.prisma.nx01Rfq.count({ where: { tenantId, status: { not: 'V' } } }),
      this.prisma.nx01Po.count({
        where: { tenantId, status: { in: ['D', 'S'] } },
      }),
      this.prisma.nx01Po.count({ where: { tenantId, status: { not: 'V' } } }),
      this.prisma.nx01Rr.count({ where: { tenantId, status: 'D' } }),
      this.prisma.nx01Rr.count({ where: { tenantId, status: { not: 'C' } } }),
      this.prisma.nx01Rr.count({
        where: {
          tenantId,
          status: 'P',
          postedAt: { gte: start, lt: end },
        },
      }),
      this.prisma.nx01Pr.count({ where: { tenantId, status: 'D' } }),
    ]);

    return {
      rfq: { pending: rfqPending, total: rfqTotal },
      po: { pending: poPending, total: poTotal },
      rr: { pending: rrPending, total: rrTotal },
      posted: { thisMonth: postedThisMonth },
      pr: { inProgress: prInProgress },
    };
  }
}
