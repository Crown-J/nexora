// apps/nx-api/src/nx03/stock-query/stock-query.controller.ts
// NX03-STOCK-LITE M2-E：庫存查詢三維度（料號 / 庫位 / 倉庫）

import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { StockQueryService } from './stock-query.service';

@Controller('nx03/stock-query')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class StockQueryController {
  constructor(private readonly svc: StockQueryService) {}

  /** 料號維度 */
  @Get('by-part/:partId')
  @Permission('inventory.stock-query.list', 'inventory.stock-query.view')
  byPart(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.byPart(user, partId);
  }

  /** 庫位維度 */
  @Get('by-location/:locationId')
  @Permission('inventory.stock-query.list', 'inventory.stock-query.view')
  byLocation(@CurrentUser() user: RequestUser, @Param('locationId') locationId: string) {
    return this.svc.byLocation(user, locationId);
  }

  /** 倉庫維度 */
  @Get('by-warehouse/:warehouseId')
  @Permission('inventory.stock-query.list', 'inventory.stock-query.view')
  byWarehouse(@CurrentUser() user: RequestUser, @Param('warehouseId') warehouseId: string) {
    return this.svc.byWarehouse(user, warehouseId);
  }
}
