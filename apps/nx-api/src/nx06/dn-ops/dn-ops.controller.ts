// apps/nx-api/src/nx06/dn-ops/dn-ops.controller.ts
// NX06 DnOps controller（跨 DN 的 stop/item 層級操作：異常 + 內部成本）

import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { DnLogisticsService } from '../dn-logistics.service';

import {
  MarkItemExceptionDto,
  MarkStopExceptionDto,
  SetItemInternalCostDto,
} from './dto/dn-ops.dto';

@Controller('nx06/dn-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class DnOpsController {
  constructor(private readonly svc: DnLogisticsService) {}

  /** 標記停點異常（外務員或倉管組長現場使用）。 */
  @Patch('stops/:stopId/exception')
  markStopException(
    @CurrentUser() user: RequestUser,
    @Param('stopId') stopId: string,
    @Body() dto: MarkStopExceptionDto,
  ) {
    return this.svc.markStopException(user, stopId, dto);
  }

  /** 標記件項異常（W=送錯 / Q=數量 / D=破損 / O=其他）。 */
  @Patch('items/:itemId/exception')
  markItemException(
    @CurrentUser() user: RequestUser,
    @Param('itemId') itemId: string,
    @Body() dto: MarkItemExceptionDto,
  ) {
    return this.svc.markItemException(user, itemId, dto);
  }

  /** 設定件項內部成本（手動寫入路徑，Lalamove webhook 自動寫入見 LalamoveIntegrationService）。 */
  @Patch('items/:itemId/internal-cost')
  setItemInternalCost(
    @CurrentUser() user: RequestUser,
    @Param('itemId') itemId: string,
    @Body() dto: SetItemInternalCostDto,
  ) {
    return this.svc.setItemInternalCost(user, itemId, dto);
  }
}
