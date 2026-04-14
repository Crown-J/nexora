import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03LedgerListQueryDto } from '../../shared/nx03/nx03-ledger-list-query.dto';

import { StockLedgerService } from './stock-ledger.service';

@Controller('nx03/stock-ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class StockLedgerController {
  constructor(private readonly svc: StockLedgerService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03LedgerListQueryDto) {
    return this.svc.list(user, q);
  }
}
