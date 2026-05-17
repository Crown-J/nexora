// apps/nx-api/src/nx05/overdue-watcher/overdue-watcher.service.ts
// NX05 OverdueWatcher service（逾期催收警示）
//
// 對齊：
//   - overview §6.4 ⭐ 逾期催收警示（Crown Q4 + Q8=a）
//   - 共享 NX04 既有 Nx99Tenant.creditOverdueDaysThreshold（不新建 schema）
//   - 對齊 NX04 CreditGuardService 範式（純 query、不寫 DB）
//
// 業務語意：
//   - tenant 閾值 default 15 天（用戶可調）
//   - 觸發後 UI 顯示警示標記（業務員主動催收）
//   - 跟 NX04 CreditGuard 同源（同 tenant 閾值、業務一致性）

import { Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { OverdueWatcherListQueryDto } from './dto/overdue-watcher.dto';

@Injectable()
export class OverdueWatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, q: OverdueWatcherListQueryDto) {
    const tenantId = requireTenantId(user);

    // load tenant 閾值（共享 NX04 既有）
    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { creditOverdueDaysThreshold: true },
    });
    const overdueThreshold = tenant?.creditOverdueDaysThreshold ?? 15;

    // query AR overdueDays > 閾值
    const arRows = await this.prisma.nx05ArLedger.findMany({
      where: {
        tenantId,
        ...(q.customerId?.trim() ? { customerId: q.customerId.trim() } : {}),
        status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
        overdueDays: { gt: overdueThreshold },
      },
      select: {
        id: true,
        docNo: true,
        soId: true,
        customerId: true,
        arDate: true,
        dueDate: true,
        balanceAmount: true,
        overdueDays: true,
        status: true,
        customer: { select: { code: true, name: true, creditStatus: true } },
      },
      orderBy: [{ overdueDays: 'desc' }, { balanceAmount: 'desc' }],
    });

    // 按 customer 分組統計
    type CustomerStat = {
      customerId: string;
      customerCode: string;
      customerName: string;
      creditStatus: string;
      arCount: number;
      totalOverdueAmount: PrismaNs.Decimal;
      maxOverdueDays: number;
    };
    const byCustomer = new Map<string, CustomerStat>();
    for (const r of arRows) {
      const cid = r.customerId;
      if (!byCustomer.has(cid)) {
        byCustomer.set(cid, {
          customerId: cid,
          customerCode: r.customer.code,
          customerName: r.customer.name,
          creditStatus: r.customer.creditStatus,
          arCount: 0,
          totalOverdueAmount: new PrismaNs.Decimal(0),
          maxOverdueDays: 0,
        });
      }
      const stat = byCustomer.get(cid)!;
      stat.arCount++;
      stat.totalOverdueAmount = stat.totalOverdueAmount.add(new PrismaNs.Decimal(r.balanceAmount));
      stat.maxOverdueDays = Math.max(stat.maxOverdueDays, r.overdueDays);
    }

    const customerSummary = Array.from(byCustomer.values()).map((s) => ({
      ...s,
      totalOverdueAmount: s.totalOverdueAmount.toString(),
    }));

    const totalOverdueAmount = arRows.reduce(
      (acc, r) => acc.add(new PrismaNs.Decimal(r.balanceAmount)),
      new PrismaNs.Decimal(0),
    );

    return {
      threshold: {
        overdueThreshold,
        note: `共享 NX99Tenant.creditOverdueDaysThreshold（與 NX04 CreditGuard 同源、業務一致性）`,
      },
      summary: {
        totalOverdueCount: arRows.length,
        totalOverdueAmount: totalOverdueAmount.toString(),
        affectedCustomerCount: byCustomer.size,
      },
      customerSummary,
      arItems: arRows.map((r) => ({
        id: r.id,
        docNo: r.docNo,
        soId: r.soId,
        customerId: r.customerId,
        customerCode: r.customer.code,
        customerName: r.customer.name,
        arDate: r.arDate,
        dueDate: r.dueDate,
        balanceAmount: r.balanceAmount.toString(),
        overdueDays: r.overdueDays,
        status: r.status,
        creditStatus: r.customer.creditStatus,
      })),
    };
  }
}
