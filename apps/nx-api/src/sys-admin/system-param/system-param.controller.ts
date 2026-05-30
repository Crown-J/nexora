// apps/nx-api/src/sys-admin/system-param/system-param.controller.ts
// v1.2 對齊軌 C5 + C-FU：系統參數 controller

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';

import { SystemParamService } from './system-param.service';

@Controller('settings/system-param')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemParamController {
  constructor(private readonly svc: SystemParamService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.svc.get(user);
  }

  @Put('data-start-date')
  @Permission('settings.system-param.edit')
  setDataStartDate(@CurrentUser() user: RequestUser, @Body() body: { date: string | null }) {
    return this.svc.setDataStartDate(user, body.date);
  }

  /// FU-system-param-01：報價單預設有效期
  @Put('quote-validity-days')
  @Permission('settings.system-param.edit')
  setQuoteValidityDays(@CurrentUser() user: RequestUser, @Body() body: { days: number }) {
    return this.svc.setQuoteDefaultValidityDays(user, body.days);
  }
}
