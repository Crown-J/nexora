// apps/nx-api/src/nx03/pick-pool/pick-pool.controller.ts
// 撿貨池 controller（SALES-FLOW 階段 1）。工作池式、非「新增撿貨單」。

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { NotFoundLineDto, PickLineDto, PickPoolQueryDto, StartPickDto } from './dto/pick-pool.dto';
import { PickPoolService } from './pick-pool.service';

@Controller('nx03/pick-pool')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.workstation.picking')
export class PickPoolController {
  constructor(private readonly svc: PickPoolService) {}

  /** 撿貨池清單（依 SO 群組）。 */
  @Get()
  getPool(@CurrentUser() user: RequestUser, @Query() q: PickPoolQueryDto) {
    return this.svc.getPool(user, q);
  }

  /** 開始撿一張 SO（備妥待撿行整批進撿貨中）。 */
  @Post('start')
  startPick(@CurrentUser() user: RequestUser, @Body() dto: StartPickDto) {
    return this.svc.startPick(user, dto);
  }

  /** 標記某行撿到了（已撿完）。 */
  @Post('pick')
  pickLine(@CurrentUser() user: RequestUser, @Body() dto: PickLineDto) {
    return this.svc.pickLine(user, dto);
  }

  /** 標記某行找不到貨。 */
  @Post('not-found')
  notFoundLine(@CurrentUser() user: RequestUser, @Body() dto: NotFoundLineDto) {
    return this.svc.notFoundLine(user, dto);
  }
}
