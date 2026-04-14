import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx08DailyReportController } from './daily-report/daily-report.controller';
import { Nx08DailyReportService } from './daily-report/daily-report.service';
import { Nx08KpiRecordController } from './kpi-record/kpi-record.controller';
import { Nx08KpiRecordService } from './kpi-record/kpi-record.service';
import { Nx08KpiTargetController } from './kpi-target/kpi-target.controller';
import { Nx08KpiTargetService } from './kpi-target/kpi-target.service';
import { Nx08MonthlyReportController } from './monthly-report/monthly-report.controller';
import { Nx08MonthlyReportService } from './monthly-report/monthly-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    Nx08DailyReportController,
    Nx08MonthlyReportController,
    Nx08KpiTargetController,
    Nx08KpiRecordController,
  ],
  providers: [Nx08DailyReportService, Nx08MonthlyReportService, Nx08KpiTargetService, Nx08KpiRecordService],
})
export class Nx08Module {}
