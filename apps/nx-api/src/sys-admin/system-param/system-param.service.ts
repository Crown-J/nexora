// apps/nx-api/src/sys-admin/system-param/system-param.service.ts
// v1.2 對齊軌 C5：系統參數 service
//
// v1.2 §12.3 系統參數：
// - 客戶等級毛利率（A/B/C/D %）← 屬 customer_grade 主檔、本軌不動
// - 詢價單客套話（開頭/結尾）← 已在 nx02/rfq-greeting-template、本軌不動
// - 報價單預設有效期 ← 列 FU
// - 資料起算點 ⭐（本軌實作）

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class SystemParamService {
  constructor(private readonly prisma: PrismaService) {}

  /// 取當前租戶系統參數（合一回 1 個 object）
  async get(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        dataStartDate: true,
        creditOverdueDaysThreshold: true,
      },
    });
    return tenant;
  }

  /// 更新資料起算點（v1.2 §12.3 ⭐）
  async setDataStartDate(user: RequestUser, dateStr: string | null) {
    const tenantId = requireTenantId(user);
    const value = dateStr ? new Date(dateStr) : null;
    await this.prisma.nx99Tenant.update({
      where: { id: tenantId },
      data: { dataStartDate: value, updatedBy: user.sub },
    });
    return { ok: true, dataStartDate: value };
  }
}
