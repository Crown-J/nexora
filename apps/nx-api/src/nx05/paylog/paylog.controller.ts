// apps/nx-api/src/nx05/paylog/paylog.controller.ts
// v1.2 階段 F P5 B：paylog + 一對多 settlement

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx05FinanceAccessGuard } from '../../shared/nx05/nx05-finance-access.guard';

import { CreatePaylogWithSettlementsDto } from './dto/paylog.dto';
import { PaylogService } from './paylog.service';

@Controller('nx05/paylog')
@UseGuards(JwtAuthGuard, RolesGuard, Nx05FinanceAccessGuard)
@Roles('SYSADMIN', 'OWNER')
export class PaylogController {
  constructor(private readonly svc: PaylogService) {}

  /**
   * v1.2 階段 F P5 B：新增收/付款 + 一對多沖銷
   * POST /nx05/paylog/with-settlements
   */
  @Post('with-settlements')
  createWithSettlements(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePaylogWithSettlementsDto,
  ) {
    return this.svc.createWithSettlements(user, dto);
  }
}
