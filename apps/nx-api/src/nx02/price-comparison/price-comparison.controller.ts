// apps/nx-api/src/nx02/price-comparison/price-comparison.controller.ts
// NX02 PriceComparison controller（比價分析 3 維度）

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PriceComparisonQueryDto } from './dto/price-comparison.dto';
import { PriceComparisonService } from './price-comparison.service';

@Controller('nx02/price-comparison')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PriceComparisonController {
  constructor(private readonly svc: PriceComparisonService) {}

  /**
   * 比價分析（3 維度）
   * - D1 歷史均價（90 天 PoItem group by supplier）
   * - D2 新品/特價（30 天 Qt 採用 + notes 給採購員判讀）
   * - D3 量大彈性折扣（PoItem 按 qty 等距分桶）
   * - meta：PartnerPart 主檔參考（defaultUnitCost / leadDays / moq）
   */
  @Get(':partId')
  compareByPartId(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Query() q: PriceComparisonQueryDto,
  ) {
    return this.svc.compareByPartId(user, partId, q);
  }
}
