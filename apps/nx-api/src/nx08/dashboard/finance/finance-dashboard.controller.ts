// apps/nx-api/src/nx08/dashboard/finance/finance-dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08FinanceDashboardService } from './finance-dashboard.service';

@Controller('nx08/dashboard/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'FINANCE')
export class Nx08FinanceDashboardController {
  constructor(private readonly svc: Nx08FinanceDashboardService) {}

  @Get('ar-overview')
  arOverview(@CurrentUser() user: RequestUser) { return this.svc.arOverview(user); }

  @Get('ap-overview')
  apOverview(@CurrentUser() user: RequestUser) { return this.svc.apOverview(user); }

  @Get('cash-flow')
  cashFlow(@CurrentUser() user: RequestUser) { return this.svc.cashFlow(user); }

  /**
   * v1.2 階段 H P1：損益表 PnL（Alex Q2=a、進銷淨額簡化法）
   * GET /nx08/dashboard/finance/pnl?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD
   */
  @Get('pnl')
  pnl(
    @CurrentUser() user: RequestUser,
    @Query() q: { periodStart: string; periodEnd: string },
  ) {
    return this.svc.pnl(user, q);
  }
}
