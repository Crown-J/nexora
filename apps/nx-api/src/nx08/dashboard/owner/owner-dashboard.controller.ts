// apps/nx-api/src/nx08/dashboard/owner/owner-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08OwnerDashboardService } from './owner-dashboard.service';

@Controller('nx08/dashboard/owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class Nx08OwnerDashboardController {
  constructor(private readonly svc: Nx08OwnerDashboardService) {}

  @Get('dept-perf')
  deptPerf(@CurrentUser() user: RequestUser) { return this.svc.deptPerf(user); }

  @Get('sales-ranking')
  salesRanking(@CurrentUser() user: RequestUser) { return this.svc.salesRanking(user); }

  @Get('kpi-gap')
  kpiGap(@CurrentUser() user: RequestUser) { return this.svc.kpiGap(user); }
}
