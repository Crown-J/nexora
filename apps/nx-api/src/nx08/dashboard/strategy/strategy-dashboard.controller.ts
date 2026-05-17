// apps/nx-api/src/nx08/dashboard/strategy/strategy-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08StrategyDashboardService } from './strategy-dashboard.service';

@Controller('nx08/dashboard/strategy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class Nx08StrategyDashboardController {
  constructor(private readonly svc: Nx08StrategyDashboardService) {}

  @Get('cross-module')
  crossModule(@CurrentUser() user: RequestUser) { return this.svc.crossModule(user); }

  /** ⭐⭐⭐ 業界改革 #3 BCG matrix 商品分類自動標記。 */
  @Get('bcg-matrix')
  bcgMatrix(@CurrentUser() user: RequestUser) { return this.svc.bcgMatrix(user); }

  @Get('strategy-kpi')
  strategyKpi(@CurrentUser() user: RequestUser) { return this.svc.strategyKpi(user); }
}
