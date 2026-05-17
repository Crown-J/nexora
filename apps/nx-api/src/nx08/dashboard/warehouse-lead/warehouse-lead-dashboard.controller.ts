// apps/nx-api/src/nx08/dashboard/warehouse-lead/warehouse-lead-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08WarehouseLeadDashboardService } from './warehouse-lead-dashboard.service';

@Controller('nx08/dashboard/warehouse-lead')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class Nx08WarehouseLeadDashboardController {
  constructor(private readonly svc: Nx08WarehouseLeadDashboardService) {}

  @Get('delivery-cost')
  deliveryCost(@CurrentUser() user: RequestUser) { return this.svc.deliveryCost(user); }

  @Get('route-efficiency')
  routeEfficiency(@CurrentUser() user: RequestUser) { return this.svc.routeEfficiency(user); }

  /** ⭐⭐⭐ 業界改革 #2 動態任務轉派統計（接合 NX06-IMPL-02）。 */
  @Get('handover-stats')
  handoverStats(@CurrentUser() user: RequestUser) { return this.svc.handoverStats(user); }
}
