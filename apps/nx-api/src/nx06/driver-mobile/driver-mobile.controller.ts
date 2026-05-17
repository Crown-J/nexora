// apps/nx-api/src/nx06/driver-mobile/driver-mobile.controller.ts
// NX06 DriverMobile controller（外務員 PWA App 後端入口）

import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { DriverMobileService } from './driver-mobile.service';

@Controller('nx06/driver-mobile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class DriverMobileController {
  constructor(private readonly svc: DriverMobileService) {}

  /** 當前 driver 名下所有 active DN（PWA tasks page）。 */
  @Get('my-dns')
  listMyDns(@CurrentUser() user: RequestUser) {
    return this.svc.listMyAssignedDns(user);
  }

  /** Dashboard 聚合（today summary + pending handover + active batch）。 */
  @Get('dashboard')
  getMyDashboard(@CurrentUser() user: RequestUser) {
    return this.svc.getMyDashboard(user);
  }
}
