// apps/nx-api/src/nx08/etl/etl.service.ts
// NX08 ETL service（HTTP endpoint trigger 外部 cron 範式、Crown Q4=b 拍板）
//
// 對齊：
//   - overview v0.1.0 §5 ETL 排程機制（純 HTTP endpoint、不註冊 @nestjs/schedule）
//   - audit-01 §2 揭露 Cache 6 表 0 writer（Q1=c 保留 schema、後續軌 TASK-NX08-IMPL-02-CACHE 啟動）
//   - Hank Q-H4：本軌全 mock shell（寫 audit log + 回 mock response、同 Lalamove / web-push 範式）

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

const NX08_ETL_ENABLED = process.env.NX08_ETL_ENABLED === 'true';

@Injectable()
export class Nx08EtlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 每日 daily-report 批次重算（mock shell、後續軌啟動）。 */
  async runDailyReport(user: RequestUser) {
    const tenantId = requireTenantId(user);
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'CREATE',
      entityTable: 'nx08_daily_report',
      entityId: 'ETL',
      summary: `[MOCK] ETL run-daily-report triggered at ${new Date().toISOString()}`,
      afterData: { triggeredBy: user.sub, jobType: 'daily-report' } as object,
    });
    return {
      ok: true,
      mode: NX08_ETL_ENABLED ? 'real' : 'mock',
      jobType: 'daily-report',
      triggeredAt: new Date().toISOString(),
      note: 'real ETL implementation pending TASK-NX08-IMPL-02-CACHE',
    };
  }

  /** 每月 monthly summary 重算（mock shell）。 */
  async runMonthlySummary(user: RequestUser) {
    const tenantId = requireTenantId(user);
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'CREATE',
      entityTable: 'nx08_monthly_report',
      entityId: 'ETL',
      summary: `[MOCK] ETL run-monthly-summary triggered at ${new Date().toISOString()}`,
      afterData: { triggeredBy: user.sub, jobType: 'monthly-summary' } as object,
    });
    return {
      ok: true,
      mode: NX08_ETL_ENABLED ? 'real' : 'mock',
      jobType: 'monthly-summary',
      triggeredAt: new Date().toISOString(),
      note: 'real ETL implementation pending TASK-NX08-IMPL-02-CACHE',
    };
  }

  /**
   * refresh Nx08*Cache（mock shell、Q1=c 後續軌 TASK-NX08-IMPL-02-CACHE 啟動）。
   * 本軌純 audit log 寫入、實際 cache 寫入留 backlog。
   */
  async refreshCache(user: RequestUser) {
    const tenantId = requireTenantId(user);
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'CREATE',
      entityTable: 'nx08_sales_cache,nx08_purchase_cache,nx08_inventory_cache,nx08_finance_cache,nx08_hr_cache,nx08_ap_cache_snapshot,nx08_ar_cache_snapshot,nx08_delivery_cache_snapshot',
      entityId: 'ETL',
      summary: `[MOCK] ETL refresh-cache triggered at ${new Date().toISOString()}（Q1=c 保留 schema、不寫入）`,
      afterData: { triggeredBy: user.sub, jobType: 'refresh-cache' } as object,
    });
    return {
      ok: true,
      mode: NX08_ETL_ENABLED ? 'real' : 'mock',
      jobType: 'refresh-cache',
      triggeredAt: new Date().toISOString(),
      cacheTargets: [
        'nx08_sales_cache',
        'nx08_purchase_cache',
        'nx08_inventory_cache',
        'nx08_finance_cache',
        'nx08_hr_cache',
        'nx08_ap_cache_snapshot',
        'nx08_ar_cache_snapshot',
        'nx08_delivery_cache_snapshot',
      ],
      note: 'Q1=c 保留 schema、本軌不啟動 writer；real wire pending TASK-NX08-IMPL-02-CACHE',
    };
  }
}
