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

import { PickAggregateDto, PickListQueryDto, ReportPickIssueDto, ResetPickDto, StagedActionDto, StagedIssueDto, StagedListQueryDto } from './dto/pick-pool.dto';
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

  // ── WMS P2 撿貨三欄：中欄「已撿貨」/右欄「已取消」清單 + 動作 ──

  /** 中欄：已撿完待包的貨（依單號/客戶）。 */
  @Get('picked')
  getPickedList(@CurrentUser() user: RequestUser, @Query() q: StagedListQueryDto) {
    return this.svc.getPickedList(user, q);
  }

  /** 右欄：訂單取消、貨已撿待放回（依單號/客戶）。 */
  @Get('cancelled')
  getCancelledList(@CurrentUser() user: RequestUser, @Query() q: StagedListQueryDto) {
    return this.svc.getCancelledList(user, q);
  }

  /** 中欄「取消撿貨」：誤按修正、退回左邊待撿。 */
  @Post('cancel-pick')
  cancelPickedLine(@CurrentUser() user: RequestUser, @Body() dto: StagedActionDto) {
    return this.svc.cancelPickedLine(user, dto);
  }

  /** 右欄「已放回」：訂單取消貨搬回原儲位（前端需二次確認）。 */
  @Post('put-back')
  putBack(@CurrentUser() user: RequestUser, @Body() dto: StagedActionDto) {
    return this.svc.putBack(user, dto);
  }

  /** 中/右欄「異常回報」：開異常回報單（接六處置）+ 移出本區。 */
  @Post('staged-issue')
  reportStagedIssue(@CurrentUser() user: RequestUser, @Body() dto: StagedIssueDto) {
    return this.svc.reportStagedIssue(user, dto);
  }
}
