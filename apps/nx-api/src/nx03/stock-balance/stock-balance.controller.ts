import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03StockBalanceListQueryDto } from '../../shared/nx03/nx03-stock-balance-list-query.dto';

import { StockBalanceService } from './stock-balance.service';

@Controller('nx03/stock-balance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class StockBalanceController {
  constructor(private readonly svc: StockBalanceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03StockBalanceListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':partId')
  listByPart(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.listByPart(user, partId);
  }
}
