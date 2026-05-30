// apps/nx-api/src/nx02/qt/qt.controller.ts
// B5 RFQ/QT API controller
//
// Access control（B5-impl §2.3 拍板方案 b、A040 + A042 closure 後更新）：
//   list 開放給所有登入 user（採購工作台「我有哪些 RFQ 可以處理」需查得到）
//   寫入 endpoint 限 SYSADMIN / OWNER / PURCHASING / SALES（NX02-IMPL-01 Phase 5 commit 5b 加 SALES）
//
// ⚠️ 命名收斂歷史：
//   A034：role.code 'ADMIN' → 'SYSADMIN'、'PURCHASE' → 'PURCHASING'
//   A040：本檔 stale 'PURCHASE' 引用 closure（軌 4.5）
//   A042：本檔 stale 'ADMIN' 引用 closure + 加 'OWNER' 對齊 7 role 真相（軌 4.6）
//   NX02-IMPL-01 Phase 5 commit 5b：加 'SALES'（Crown Q-C4=A + Q-5b-1=a 同行調貨業務歸 NX04 SALES）

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CancelRfqBodyDto,
  CreateQtDto,
  ListRfqQueryDto,
  RejectQtBodyDto,
} from './dto/qt.dto';
import { Nx02QtService } from './qt.service';

@Controller('nx02')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class QtController {
  constructor(private readonly svc: Nx02QtService) {}

  /** §3.1 採購工作台 RFQ list — 任意登入 user */
  @Get('rfq/list-for-purchase')
  @Permission('purchase.rfq.list')
  list(@CurrentUser() user: RequestUser, @Query() q: ListRfqQueryDto) {
    return this.svc.listRfqsForPurchase(user, q);
  }

  /** M3-redo-3b：list quotes by RFQ id（並排比價視圖用、最低價排前） */
  @Get('rfq/:id/quotes')
  @Permission('purchase.rfq.view')
  listQuotes(@CurrentUser() user: RequestUser, @Param('id') rfqId: string) {
    return this.svc.listQuotesByRfqId(user, rfqId);
  }

  /** §3.2 新增 QT */
  @Post('qt')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
  @Permission('purchase.rfq.edit')
  addQt(@CurrentUser() user: RequestUser, @Body() dto: CreateQtDto) {
    return this.svc.addQt(user, dto);
  }

  /** §3.3 採用 QT */
  @Post('qt/:id/adopt')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
  @Permission('purchase.rfq.edit', 'purchase.po.create')
  adoptQt(@CurrentUser() user: RequestUser, @Param('id') qtId: string) {
    return this.svc.adoptQt(user, qtId);
  }

  /** §3.4 拒絕單筆 QT */
  @Post('qt/:id/reject')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
  @Permission('purchase.rfq.edit')
  rejectQt(
    @CurrentUser() user: RequestUser,
    @Param('id') qtId: string,
    @Body() dto: RejectQtBodyDto,
  ) {
    return this.svc.rejectQt(user, qtId, dto);
  }

  /** §3.5 取消整個 RFQ */
  @Post('rfq/:id/cancel')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
  @Permission('purchase.rfq.delete')
  cancelRfq(
    @CurrentUser() user: RequestUser,
    @Param('id') rfqId: string,
    @Body() dto: CancelRfqBodyDto,
  ) {
    return this.svc.cancelRfq(user, rfqId, dto);
  }
}
