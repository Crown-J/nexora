// apps/nx-api/src/nx04/sales-performance/sales-performance.controller.ts
// NX04 SalesPerformance controller（LITE/PLUS 業績查詢 endpoint）

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { SalesPerformanceQueryDto } from './dto/sales-performance.dto';
import { SalesPerformanceService } from './sales-performance.service';

@Controller('nx04/sales-performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'SALES')
export class SalesPerformanceController {
  constructor(private readonly svc: SalesPerformanceService) {}

  /**
   * 業績查詢（LITE/PLUS、毛利顯示 + 手動目標對比）
   *   - userId 預設當前 user（自己看自己業績）
   *   - year + month 範圍（month 空=整年）
   *   - target 純對比、不存
   */
  @Get('stats')
  getStats(@CurrentUser() user: RequestUser, @Query() q: SalesPerformanceQueryDto) {
    return this.svc.getStats(user, q);
  }
}
