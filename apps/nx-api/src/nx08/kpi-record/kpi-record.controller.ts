import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx08ProPlanGuard } from '../../shared/nx08/nx08-pro-plan.guard';

import { UpsertKpiRecordDto } from './kpi-record.dto';
import { Nx08KpiRecordService } from './kpi-record.service';
import { Nx08KpiRecordListQueryDto } from './nx08-kpi-record-list-query.dto';

@Controller('nx08/kpi-record')
@UseGuards(JwtAuthGuard, Nx08ProPlanGuard)
export class Nx08KpiRecordController {
  constructor(private readonly svc: Nx08KpiRecordService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx08KpiRecordListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post()
  upsert(@CurrentUser() user: RequestUser, @Body() dto: UpsertKpiRecordDto) {
    return this.svc.upsert(user, dto);
  }
}
