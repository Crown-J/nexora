// apps/nx-api/src/nx08/dashboard/sales-rep/sales-rep-dashboard.controller.ts
// NX08 業務員 dashboard controller

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08SalesRepDashboardService } from './sales-rep-dashboard.service';

@Controller('nx08/dashboard/sales-rep')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'SALES')
export class Nx08SalesRepDashboardController {
  constructor(private readonly svc: Nx08SalesRepDashboardService) {}

  @Get('personal-sales')
  personalSales(@CurrentUser() user: RequestUser) {
    return this.svc.personalSales(user);
  }

  @Get('customer-insight')
  customerInsight(@CurrentUser() user: RequestUser) {
    return this.svc.customerInsight(user);
  }

  @Get('product-sales')
  productSales(@CurrentUser() user: RequestUser) {
    return this.svc.productSales(user);
  }

  /**
   * v1.2 階段 H P3a：個人月報（業績+毛利+開單數+撿貨+跑客戶）
   * GET /nx08/dashboard/sales-rep/personal-monthly-report
   *   ?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD&userId=（負責人可選其他人）
   */
  @Get('personal-monthly-report')
  personalMonthlyReport(
    @CurrentUser() user: RequestUser,
    @Query() q: { periodStart: string; periodEnd: string; userId?: string },
  ) {
    return this.svc.personalMonthlyReport(user, q);
  }
}
