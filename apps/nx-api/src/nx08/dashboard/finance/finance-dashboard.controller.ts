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

  /// 對帳查詢（銷售視角）：依客戶彙總未收款、逾期大的排前面。規格 §4.2
  /// ⚠️ 本 controller 類別層只開財務角色，但規格把「對帳查詢」放在銷售第 7 格
  ///    （業務出貨前要看客戶有沒有逾期）——所以這一支方法層加開 SALES。
  ///    ⛔ 只加這一支，ap-overview／cash-flow／pnl 仍不開給業務。
  @Get('ar-by-customer')
  @Roles('SYSADMIN', 'OWNER', 'FINANCE', 'SALES')
  arByCustomer(@CurrentUser() user: RequestUser) { return this.svc.arByCustomer(user); }

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
