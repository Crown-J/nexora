// apps/nx-api/src/nx01/partner-account/partner-account.controller.ts
// 往來帳戶 API（帳戶閘門規格 v1.3 Step 3a）：開戶/清單/停啟用；守衛比照 partner controller
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { OpenPartnerAccountDto, PatchPartnerAccountDto } from './dto/partner-account.dto';
import { PartnerAccountService } from './partner-account.service';

@Controller('nx01')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerAccountController {
  constructor(private readonly svc: PartnerAccountService) {}

  @Get('partners/:id/accounts')
  listByPartner(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listByPartner(user, id);
  }

  @Post('partners/:id/accounts')
  open(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: OpenPartnerAccountDto) {
    return this.svc.open(user, id, dto);
  }

  @Patch('partner-accounts/:id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchPartnerAccountDto) {
    return this.svc.patch(user, id, dto);
  }
}
