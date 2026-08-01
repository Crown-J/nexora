// apps/nx-api/src/nx08/dashboard/home/home-dashboard.service.ts
// 首頁待辦彙總（2026-07-11 執行長拍板首頁改版 V1：待辦卡 + 快捷動作 + 主管數字 + 公告）
// 一次回傳三組待辦計數 + 主管今日數字（OWNER/SYSADMIN 才給、其他 null）
// 全 count 級查詢 Promise.all 併發；角色個人化配置=V2（拍板分期、本版全員看全組）
// ⚠️ 庫存警戒卡緩列：nx03_part_stock_setting 目前無營運資料、等安全庫存維護上線再加
//
// 2026-08-01 v3.0.0 階段 3：新工作檯改成規格 §3.3 的三塊（今天要處理／要追蹤的／我的待辦）。
//   本次為**加性擴充**——既有 sales / warehouse / finance / manager 欄位一個都沒動，
//   新增 track（要追蹤的）與 mine（我的待辦）兩組。
//
// ⚠️ 規格 §3.3 列了 8 個項目、系統目前只做得出 6 個。缺的兩個**不造假、不放空卡**：
//   · 生日回訪 —— 客戶主檔（nx01_partner）沒有生日欄位，只有員工檔（nx01_user）有
//   · 待簽核   —— 全系統沒有簽核單據表，九宮格「待簽核」也還是未建置狀態
//   兩項都列為補做候選、已回報執行長。

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
    /** 久未下單的判定線：曾經下過單、但最近 90 天沒再下 —— 客戶流失預警 */
    const dormantSince = new Date(t0);
    dormantSince.setDate(dormantSince.getDate() - 90);

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
      expiredQuotes,
      dormantCustomers,
      openIssues,
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
      // ── v3.0.0 §3.3「要追蹤的」──
      // 報價過期：還在開放狀態（草稿/已送出）但有效期已過 —— 不追就爛掉的那種
      // ⚠️ 不含已經被標成 EXPIRED 的，那些是系統已經處理過的
      this.prisma.nx04Quote.count({
        where: { tenantId, status: { in: ['DRAFT', 'SENT'] }, validUntil: { lt: t0 } },
      }),
      // 久未下單：曾經下過單、但最近 90 天沒再下的客戶數
      // 用 raw：需要「每客戶最後一筆單」再比對，count 級查詢做不到
      this.prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT customer_id
          FROM nx04_so
          WHERE tenant_id = ${tenantId}
            AND status NOT IN ('DRAFT', 'CANCELLED')
          GROUP BY customer_id
          HAVING MAX(so_date) < ${dormantSince}
        ) t
      `,
      // ── v3.0.0 §3.3「我的待辦」──
      // 異常回報：還沒結案的
      this.prisma.nx03IssueReport.count({
        where: { tenantId, status: { notIn: ['CLOSED', 'CANCELLED'] } },
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
      // v3.0.0 §3.3「要追蹤的」：不追會爛掉、但今天不做也不會死的
      track: {
        expiredQuotes,
        dormantCustomers: Number(dormantCustomers[0]?.n ?? 0),
        overdueAr,
        apDueSoon,
      },
      // v3.0.0 §3.3「我的待辦」：⚠️ 待簽核缺席——系統還沒有簽核單據表
      mine: { openIssues },
    };
  }
}
