// apps/nx-api/src/nx04/credit-guard/credit-guard.controller.ts
// NX04 CreditGuard controller（客戶授信擋單 endpoint、UI 預檢用）
// 對齊 overview §4 + Crown Q7

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CheckCreditDto } from './dto/credit-guard.dto';
import { CreditGuardService } from './credit-guard.service';

@Controller('nx04/credit-guard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'SALES')
export class CreditGuardController {
  constructor(private readonly svc: CreditGuardService) {}

  /**
   * 授信預檢（UI 開單前呼叫、預覽是否會被擋 + 預期付款條件）
   *   - 黑名單擋 → 403
   *   - 額度超額擋 → 403
   *   - 逾期 → 200 + overdueTransferToCash=true + adjustedPaymentTerm='CASH'
   *   - 通過 → 200 + adjustedPaymentTerm = 從 partner 帶入
   */
  @Post('check')
  check(@CurrentUser() user: RequestUser, @Body() dto: CheckCreditDto) {
    return this.svc.check(user, dto);
  }
}
