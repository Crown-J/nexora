import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/module-access/module-access.guard';
import { RequiresModule } from '../../shared/module-access/requires-module.decorator';

import { UpsertKpiRecordDto } from './kpi-record.dto';
import { Nx08KpiRecordService } from './kpi-record.service';
import { Nx08KpiRecordListQueryDto } from './nx08-kpi-record-list-query.dto';

@Controller('nx08/kpi-record')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('NX08')
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
