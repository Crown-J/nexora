// apps/nx-api/src/nx04/co-estimate/co-estimate.controller.ts
// NX04 CoEstimate controller（客訂預估價 endpoint）

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { EstimatePriceDto } from './dto/co-estimate.dto';
import { CoEstimateService } from './co-estimate.service';

@Controller('nx04/co-estimate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'SALES')
export class CoEstimateController {
  constructor(private readonly svc: CoEstimateService) {}

  /**
   * 客訂預估價（系統算、業務員不用憑經驗）
   * - 公式：max(歷史成本 × (1 + marginPct/100), part 等級 priceX)
   * - 無歷史 → fallback 等級 priceX
   * - 業務員可手動覆寫（service 純算建議價）
   */
  @Post('estimate')
  estimate(@CurrentUser() user: RequestUser, @Body() dto: EstimatePriceDto) {
    return this.svc.estimate(user, dto);
  }
}
