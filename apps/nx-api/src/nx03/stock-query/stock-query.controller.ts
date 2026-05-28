// apps/nx-api/src/nx03/stock-query/stock-query.controller.ts
// NX03-STOCK-LITE M2-E：庫存查詢三維度（料號 / 庫位 / 倉庫）

import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { StockQueryService } from './stock-query.service';

@Controller('nx03/stock-query')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class StockQueryController {
  constructor(private readonly svc: StockQueryService) {}

  /** 料號維度：1 partId × N warehouse × M location（locations 只回 onHand > 0） */
  @Get('by-part/:partId')
  byPart(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.byPart(user, partId);
  }

  /** 庫位維度：1 locationId × N part（純從 ledger aggregate、Crown 拍板 B 方案 C） */
  @Get('by-location/:locationId')
  byLocation(@CurrentUser() user: RequestUser, @Param('locationId') locationId: string) {
    return this.svc.byLocation(user, locationId);
  }

  /** 倉庫維度：1 warehouseId × N part（含 4 KPI summary） */
  @Get('by-warehouse/:warehouseId')
  byWarehouse(@CurrentUser() user: RequestUser, @Param('warehouseId') warehouseId: string) {
    return this.svc.byWarehouse(user, warehouseId);
  }
}
