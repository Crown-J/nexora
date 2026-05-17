// apps/nx-api/src/nx02/purchase-stage/purchase-stage.controller.ts
// NX02 PurchaseStage controller（國外採購 6 階段流轉）
// 對齊 overview §3.7 + Crown Q-C3=A strict 推進 + Q-C3-detail=b 任意回退

import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { TransitStageDto } from './dto/purchase-stage.dto';
import { PurchaseStageService } from './purchase-stage.service';

@Controller('nx02/po')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PurchaseStageController {
  constructor(private readonly svc: PurchaseStageService) {}

  /**
   * 國外採購 6 階段流轉（合一推進 + 回退、service 自動判斷）
   *   - 推進：strict 順序（必須 +1）
   *   - 回退：任意回退（Crown Q-C3-detail=b、業務修錯）
   *   - 同 stage：no-op
   *   - 推進時自動寫對應時間欄、回退時不清除（fact 保留）
   */
  @Patch(':id/stage')
  transit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: TransitStageDto,
  ) {
    return this.svc.transit(user, id, dto);
  }
}
