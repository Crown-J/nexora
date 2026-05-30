import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03StockBalanceListQueryDto } from '../../shared/nx03/nx03-stock-balance-list-query.dto';

import { StockBalanceService } from './stock-balance.service';

@Controller('nx03/stock-balance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.stock-query.list')
export class StockBalanceController {
  constructor(private readonly svc: StockBalanceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03StockBalanceListQueryDto) {
    return this.svc.list(user, q);
  }

  /** 4 KPI 統計（對齊 AUDIT-03 業務語意：total / inStock / zero / negative）。 */
  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query() q: Nx03StockBalanceListQueryDto) {
    return this.svc.summary(user, q);
  }

  /** Dashboard hub KPI（summary + 庫存總值 + 倉庫數）。 */
  @Get('dashboard')
  dashboard(@CurrentUser() user: RequestUser, @Query() q: Nx03StockBalanceListQueryDto) {
    return this.svc.dashboard(user, q);
  }

  /** 單一料號於各倉庫之庫存（路徑參數放最後、避免吃掉 summary/dashboard）。 */
  @Get(':partId')
  listByPart(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.listByPart(user, partId);
  }
}
