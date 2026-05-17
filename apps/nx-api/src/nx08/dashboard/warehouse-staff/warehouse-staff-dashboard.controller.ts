// apps/nx-api/src/nx08/dashboard/warehouse-staff/warehouse-staff-dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { Nx08WarehouseStaffDashboardService } from './warehouse-staff-dashboard.service';

@Controller('nx08/dashboard/warehouse-staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class Nx08WarehouseStaffDashboardController {
  constructor(private readonly svc: Nx08WarehouseStaffDashboardService) {}

  @Get('turnover')
  turnover(@CurrentUser() user: RequestUser) { return this.svc.turnover(user); }

  @Get('dormant')
  dormant(@CurrentUser() user: RequestUser) { return this.svc.dormant(user); }

  @Get('low-stock-alert')
  lowStockAlert(@CurrentUser() user: RequestUser) { return this.svc.lowStockAlert(user); }
}
