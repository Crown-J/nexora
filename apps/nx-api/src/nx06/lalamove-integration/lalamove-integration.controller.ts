// apps/nx-api/src/nx06/lalamove-integration/lalamove-integration.controller.ts
// NX06 LalamoveIntegration controller（Lalamove API 半自動整合）

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateLalamoveOrderDto,
  LalamoveWebhookDto,
} from './dto/lalamove-integration.dto';
import { LalamoveIntegrationService } from './lalamove-integration.service';

@Controller('nx06/lalamove')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class LalamoveIntegrationController {
  constructor(private readonly svc: LalamoveIntegrationService) {}

  /**
   * 建 Lalamove 訂單（倉管組長發起、半自動）
   *   - LALAMOVE_API_ENABLED=false（預設）→ mock 模式
   *   - LALAMOVE_API_ENABLED=true → 實際 HTTP call（後續軌啟動）
   */
  @Post(':dnId/create')
  createOrder(
    @CurrentUser() user: RequestUser,
    @Param('dnId') dnId: string,
    @Body() dto: CreateLalamoveOrderDto,
  ) {
    return this.svc.createOrder(user, dnId, dto);
  }

  /**
   * Lalamove webhook（接收 Lalamove 狀態更新）
   *   - 更新 lalamove_callback_status
   *   - COMPLETED + actualFee → 寫 DnItem.internalCost
   *   - ⚠️ production 部署需 Lalamove dashboard 配置 webhook URL + 公網可訪問
   */
  @Post('webhook')
  handleWebhook(
    @CurrentUser() user: RequestUser,
    @Body() dto: LalamoveWebhookDto,
  ) {
    return this.svc.handleWebhook(user, dto);
  }
}
