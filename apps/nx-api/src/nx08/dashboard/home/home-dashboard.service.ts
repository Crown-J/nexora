// apps/nx-api/src/nx08/dashboard/home/home-dashboard.service.ts
// 首頁待辦彙總（2026-07-11 執行長拍板首頁改版 V1：待辦卡 + 快捷動作 + 主管數字 + 公告）
// 一次回傳三組待辦計數 + 主管今日數字（OWNER/SYSADMIN 才給、其他 null）
// 全 count 級查詢 Promise.all 併發；角色個人化配置=V2（拍板分期、本版全員看全組）
// ⚠️ 庫存警戒卡緩列：nx03_part_stock_setting 目前無營運資料、等安全庫存維護上線再加

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantId } from '../../../shared/nx01/require-tenant';

@Injectable()
export class Nx08HomeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    const t1 = new Date(t0);
    t1.setDate(t1.getDate() + 1);
    const due7 = new Date(t0);
    due7.setDate(due7.getDate() + 7);

    const [
      openQuotes,
      toShipSo,
      replenishingItems,
      overdueAr,
      inspectingRr,
      pickingItems,
      packingItems,
      apDueSoon,
      todaySo,
    ] = await Promise.all([
      // 未結報價（DRAFT/SENT、對齊 quote.service 開放判定）
      this.prisma.nx04Quote.count({ where: { tenantId, status: { in: ['DRAFT', 'SENT'] } } }),
      // 待出貨銷貨（已確認/撿貨中）
      this.prisma.nx04So.count({ where: { tenantId, status: { in: ['CONFIRMED', 'PICKING'] } } }),
      // 補貨中明細（雙段狀態第一段 P 待補/I 補貨中；tenant 走 so 關聯）
      this.prisma.nx04SoItem.count({
        where: { transferStatus: { in: ['P', 'I'] }, so: { tenantId, status: { notIn: ['CANCELLED'] } } },
      }),
      // 逾期應收（OPEN/PARTIAL 且已過期、對齊 ap.service OVERDUE 口徑）
      this.prisma.nx05ArLedger.count({
        where: { tenantId, status: { in: ['OPEN', 'PARTIAL'] }, dueDate: { lt: t0 } },
      }),
      // 待驗收進貨
      this.prisma.nx02Rr.count({ where: { tenantId, status: 'INSPECTING', voidedAt: null } }),
      // 待撿貨明細（雙段狀態第二段 PK）
      this.prisma.nx04SoItem.count({
        where: { fulfillStatus: 'PK', so: { tenantId, status: { notIn: ['CANCELLED'] } } },
      }),
      // 待包貨明細（PL）
      this.prisma.nx04SoItem.count({
        where: { fulfillStatus: 'PL', so: { tenantId, status: { notIn: ['CANCELLED'] } } },
      }),
      // 7 日內到期應付（含已逾期）
      this.prisma.nx05ApLedger.count({
        where: { tenantId, status: { in: ['OPEN', 'PARTIAL'] }, dueDate: { lte: due7 } },
      }),
      // 主管今日數字：今日銷貨（草稿/作廢不計）
      this.prisma.nx04So.aggregate({
        where: { tenantId, soDate: { gte: t0, lt: t1 }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const isManager = user.roles.some((r) =>
      ['OWNER', 'SYSADMIN'].includes(String(r).trim().toUpperCase()),
    );

    return {
      sales: { openQuotes, toShipSo, replenishingItems, overdueAr },
      warehouse: { inspectingRr, pickingItems, packingItems },
      finance: { apDueSoon, overdueAr },
      manager: isManager
        ? { todaySoAmount: (todaySo._sum.totalAmount ?? 0).toString(), todaySoCount: todaySo._count }
        : null,
    };
  }
}
