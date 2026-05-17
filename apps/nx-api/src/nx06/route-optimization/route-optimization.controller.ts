// apps/nx-api/src/nx06/route-optimization/route-optimization.controller.ts
// NX06 RouteOptimization controller（單車 + 多車 VRP）

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  OptimizeMultiVehicleDto,
  OptimizeSingleVehicleDto,
} from './dto/route-optimization.dto';
import { RouteOptimizationService } from './route-optimization.service';

@Controller('nx06/route-optimization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class RouteOptimizationController {
  constructor(private readonly svc: RouteOptimizationService) {}

  /** 單車優化（≤ 30 DN）。 */
  @Post('single-vehicle')
  optimizeSingleVehicle(
    @CurrentUser() user: RequestUser,
    @Body() dto: OptimizeSingleVehicleDto,
  ) {
    return this.svc.optimizeSingleVehicle(user, dto);
  }

  /** 多車優化 VRP 簡化版（≤ 5 driver / ≤ 100 DN）。 */
  @Post('multi-vehicle')
  optimizeMultiVehicle(
    @CurrentUser() user: RequestUser,
    @Body() dto: OptimizeMultiVehicleDto,
  ) {
    return this.svc.optimizeMultiVehicle(user, dto);
  }

  /** 查詢某 route batch 內所有 DN 順序。 */
  @Get('batch/:batchId')
  getBatch(@CurrentUser() user: RequestUser, @Param('batchId') batchId: string) {
    return this.svc.getBatch(user, batchId);
  }
}
