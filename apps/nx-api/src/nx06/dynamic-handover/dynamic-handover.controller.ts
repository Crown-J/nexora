// apps/nx-api/src/nx06/dynamic-handover/dynamic-handover.controller.ts
// NX06 動態任務轉派 controller

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { DynamicHandoverService } from './dynamic-handover.service';
import {
  CreateHandoverDto,
  SuggestHandoverDto,
  UpdateHandoverStatusDto,
} from './dto/dynamic-handover.dto';

@Controller('nx06/handover')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class DynamicHandoverController {
  constructor(private readonly svc: DynamicHandoverService) {}

  /** 演算法推薦動態交接候選（半徑 + 任務量 + ETA、前 3 名）。 */
  @Post('suggest')
  suggest(@CurrentUser() user: RequestUser, @Body() dto: SuggestHandoverDto) {
    return this.svc.suggestCandidates(user, dto);
  }

  /** 倉管組長拍板：建立 Handover 紀錄。 */
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHandoverDto) {
    return this.svc.createHandover(user, dto);
  }

  /** 變更 handover 狀態（ACCEPT / REJECT / COMPLETE / CANCEL）。 */
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateHandoverStatusDto,
  ) {
    return this.svc.updateStatus(user, id, dto);
  }

  /** 某 DN 的 handover 歷史。 */
  @Get('dn/:dnId')
  listByDn(@CurrentUser() user: RequestUser, @Param('dnId') dnId: string) {
    return this.svc.listByDn(user, dnId);
  }

  /** 某 driver 的待處理 / 進行中 handover（外務員 App 用）。 */
  @Get('driver/:driverId')
  listForDriver(
    @CurrentUser() user: RequestUser,
    @Param('driverId') driverId: string,
  ) {
    return this.svc.listForDriver(user, driverId);
  }
}
