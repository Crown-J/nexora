// apps/nx-api/src/nx08/etl/etl.controller.ts
// NX08 ETL controller（HTTP endpoint trigger 範式、外部 cron 呼叫）

import { Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { Nx08EtlService } from './etl.service';

@Controller('nx08/etl')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN')
export class Nx08EtlController {
  constructor(private readonly svc: Nx08EtlService) {}

  /** 每日 daily-report 批次重算（外部 cron 呼叫）。 */
  @Post('run-daily-report')
  runDailyReport(@CurrentUser() user: RequestUser) {
    return this.svc.runDailyReport(user);
  }

  /** 每月 monthly summary 重算。 */
  @Post('run-monthly-summary')
  runMonthlySummary(@CurrentUser() user: RequestUser) {
    return this.svc.runMonthlySummary(user);
  }

  /** refresh Nx08*Cache（Q1=c 後續軌啟動真實寫入）。 */
  @Post('refresh-cache')
  refreshCache(@CurrentUser() user: RequestUser) {
    return this.svc.refreshCache(user);
  }
}
