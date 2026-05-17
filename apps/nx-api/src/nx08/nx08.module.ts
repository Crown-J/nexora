// apps/nx-api/src/nx08/nx08.module.ts
// NX08 報表分析 module（既有 4 service + IMPL-01 7 dashboard service + ETL）

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx08DailyReportController } from './daily-report/daily-report.controller';
import { Nx08DailyReportService } from './daily-report/daily-report.service';
import { Nx08FinanceDashboardController } from './dashboard/finance/finance-dashboard.controller';
import { Nx08FinanceDashboardService } from './dashboard/finance/finance-dashboard.service';
import { Nx08OwnerDashboardController } from './dashboard/owner/owner-dashboard.controller';
import { Nx08OwnerDashboardService } from './dashboard/owner/owner-dashboard.service';
import { Nx08PurchasingDashboardController } from './dashboard/purchasing/purchasing-dashboard.controller';
import { Nx08PurchasingDashboardService } from './dashboard/purchasing/purchasing-dashboard.service';
import { Nx08SalesRepDashboardController } from './dashboard/sales-rep/sales-rep-dashboard.controller';
import { Nx08SalesRepDashboardService } from './dashboard/sales-rep/sales-rep-dashboard.service';
import { Nx08StrategyDashboardController } from './dashboard/strategy/strategy-dashboard.controller';
import { Nx08StrategyDashboardService } from './dashboard/strategy/strategy-dashboard.service';
import { Nx08WarehouseLeadDashboardController } from './dashboard/warehouse-lead/warehouse-lead-dashboard.controller';
import { Nx08WarehouseLeadDashboardService } from './dashboard/warehouse-lead/warehouse-lead-dashboard.service';
import { Nx08WarehouseStaffDashboardController } from './dashboard/warehouse-staff/warehouse-staff-dashboard.controller';
import { Nx08WarehouseStaffDashboardService } from './dashboard/warehouse-staff/warehouse-staff-dashboard.service';
import { Nx08EtlController } from './etl/etl.controller';
import { Nx08EtlService } from './etl/etl.service';
import { Nx08KpiRecordController } from './kpi-record/kpi-record.controller';
import { Nx08KpiRecordService } from './kpi-record/kpi-record.service';
import { Nx08KpiTargetController } from './kpi-target/kpi-target.controller';
import { Nx08KpiTargetService } from './kpi-target/kpi-target.service';
import { Nx08MonthlyReportController } from './monthly-report/monthly-report.controller';
import { Nx08MonthlyReportService } from './monthly-report/monthly-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    // 既有 4 controller
    Nx08DailyReportController,
    Nx08MonthlyReportController,
    Nx08KpiTargetController,
    Nx08KpiRecordController,
    // IMPL-01 7 dashboard controller（角色 dashboard、3 業界改革 inline）
    Nx08SalesRepDashboardController,
    Nx08WarehouseStaffDashboardController,
    Nx08WarehouseLeadDashboardController, // 含 handoverStats ⭐⭐⭐
    Nx08PurchasingDashboardController, // 含 arRecallHitRate ⭐⭐⭐
    Nx08FinanceDashboardController,
    Nx08OwnerDashboardController,
    Nx08StrategyDashboardController, // 含 bcgMatrix ⭐⭐⭐
    // IMPL-01 ETL（外部 cron 觸發、mock shell）
    Nx08EtlController,
  ],
  providers: [
    Nx08DailyReportService,
    Nx08MonthlyReportService,
    Nx08KpiTargetService,
    Nx08KpiRecordService,
    Nx08SalesRepDashboardService,
    Nx08WarehouseStaffDashboardService,
    Nx08WarehouseLeadDashboardService,
    Nx08PurchasingDashboardService,
    Nx08FinanceDashboardService,
    Nx08OwnerDashboardService,
    Nx08StrategyDashboardService,
    Nx08EtlService,
  ],
})
export class Nx08Module {}
