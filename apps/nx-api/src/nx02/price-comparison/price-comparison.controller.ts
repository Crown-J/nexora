// apps/nx-api/src/nx02/price-comparison/price-comparison.controller.ts
// NX02 PriceComparison controller（比價分析 3 維度）

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PriceComparisonQueryDto } from './dto/price-comparison.dto';
import { PriceComparisonService } from './price-comparison.service';

@Controller('nx02/price-comparison')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PriceComparisonController {
  constructor(private readonly svc: PriceComparisonService) {}

  @Get(':partId')
  @Permission('purchase.product.view')
  compareByPartId(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Query() q: PriceComparisonQueryDto,
  ) {
    return this.svc.compareByPartId(user, partId, q);
  }
}
