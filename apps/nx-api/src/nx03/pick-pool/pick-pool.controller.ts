// apps/nx-api/src/nx03/pick-pool/pick-pool.controller.ts
// 撿貨清單 controller（SALES-FLOW 撿貨重設計）。庫位軸、同料件合併總量。

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PickAggregateDto, PickListQueryDto, ReportPickIssueDto, ResetPickDto } from './dto/pick-pool.dto';
import { PickPoolService } from './pick-pool.service';

@Controller('nx03/pick-pool')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.workstation.picking')
export class PickPoolController {
  constructor(private readonly svc: PickPoolService) {}

  /** 撿貨清單（依庫位分組、同料件合併總量）。 */
  @Get()
  getPickList(@CurrentUser() user: RequestUser, @Query() q: PickListQueryDto) {
    return this.svc.getPickList(user, q);
  }

  /** 撿取（qty 省略=全部撿取 / 帶 qty=部分撿取）。 */
  @Post('pick')
  pickAggregate(@CurrentUser() user: RequestUser, @Body() dto: PickAggregateDto) {
    return this.svc.pickAggregate(user, dto);
  }

  /** 撿貨異常（對剩餘量開正式異常回報單）。 */
  @Post('issue')
  reportPickIssue(@CurrentUser() user: RequestUser, @Body() dto: ReportPickIssueDto) {
    return this.svc.reportPickIssue(user, dto);
  }

  /** 重置數量（把某倉×料件已撿量歸零）。 */
  @Post('reset')
  resetPick(@CurrentUser() user: RequestUser, @Body() dto: ResetPickDto) {
    return this.svc.resetPick(user, dto);
  }
}
