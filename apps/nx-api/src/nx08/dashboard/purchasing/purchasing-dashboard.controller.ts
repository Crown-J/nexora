// apps/nx-api/src/nx08/dashboard/purchasing/purchasing-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08PurchasingDashboardService } from './purchasing-dashboard.service';

@Controller('nx08/dashboard/purchasing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class Nx08PurchasingDashboardController {
  constructor(private readonly svc: Nx08PurchasingDashboardService) {}

  @Get('supplier-grade')
  supplierGrade(@CurrentUser() user: RequestUser) { return this.svc.supplierGrade(user); }

  @Get('price-compare')
  priceCompare(@CurrentUser() user: RequestUser) { return this.svc.priceCompare(user); }

  @Get('po-stats')
  poStats(@CurrentUser() user: RequestUser) { return this.svc.poStats(user); }

  /** ⭐⭐⭐ 業界改革 #1 AR 補貨建議命中率（接合 AR-IMPL-01）。 */
  @Get('ar-recall-hit-rate')
  arRecallHitRate(@CurrentUser() user: RequestUser) { return this.svc.arRecallHitRate(user); }
}
