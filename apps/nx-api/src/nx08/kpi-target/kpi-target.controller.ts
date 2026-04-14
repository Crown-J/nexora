import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx08ProPlanGuard } from '../../shared/nx08/nx08-pro-plan.guard';

import { CreateKpiTargetDto, PatchKpiTargetDto } from './kpi-target.dto';
import { Nx08KpiTargetService } from './kpi-target.service';
import { Nx08KpiTargetListQueryDto } from './nx08-kpi-list-query.dto';

@Controller('nx08/kpi-target')
@UseGuards(JwtAuthGuard, Nx08ProPlanGuard)
export class Nx08KpiTargetController {
  constructor(private readonly svc: Nx08KpiTargetService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx08KpiTargetListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateKpiTargetDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchKpiTargetDto) {
    return this.svc.patch(user, id, dto);
  }
}
