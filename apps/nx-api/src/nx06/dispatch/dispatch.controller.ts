// apps/nx-api/src/nx06/dispatch/dispatch.controller.ts
// NX06 Dispatch controller（倉管組長配單）

import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { AssignDispatchDto } from './dto/dispatch.dto';
import { DispatchService } from './dispatch.service';

@Controller('nx06/dispatch')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class DispatchController {
  constructor(private readonly svc: DispatchService) {}

  /**
   * 倉管組長配單（DRAFT → DISPATCHED + 指派外務 + 車輛）
   *   - 對齊 Crown Q1 拍板 WAREHOUSE 主操作
   *   - DN must be DRAFT
   *   - driver 必存在 + isActive
   */
  @Patch(':dnId/assign')
  assign(
    @CurrentUser() user: RequestUser,
    @Param('dnId') dnId: string,
    @Body() dto: AssignDispatchDto,
  ) {
    return this.svc.assignDriver(user, dnId, dto);
  }
}
