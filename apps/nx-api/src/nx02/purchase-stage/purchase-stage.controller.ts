// apps/nx-api/src/nx02/purchase-stage/purchase-stage.controller.ts
// NX02 PurchaseStage controller（國外採購 6 階段流轉）
// 對齊 overview §3.7 + Crown Q-C3=A strict 推進 + Q-C3-detail=b 任意回退

import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { TransitStageDto } from './dto/purchase-stage.dto';
import { PurchaseStageService } from './purchase-stage.service';

@Controller('nx02/po')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PurchaseStageController {
  constructor(private readonly svc: PurchaseStageService) {}

  /// 國外採購 6 階段流轉
  @Patch(':id/stage')
  @Permission('purchase.po.edit')
  transit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: TransitStageDto,
  ) {
    return this.svc.transit(user, id, dto);
  }
}
