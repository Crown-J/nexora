// apps/nx-api/src/nx02/qt/qt.controller.ts
// B5 RFQ/QT API controller
//
// Access control（B5-impl §2.3 拍板方案 b）：
//   list 開放給所有登入 user（採購工作台「我有哪些 RFQ 可以處理」需查得到）
//   寫入 endpoint 限 ADMIN/PURCHASE（RolesGuard ADMIN 全通行邏輯已 cover 系管）

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CancelRfqBodyDto,
  CreateQtDto,
  ListRfqQueryDto,
  RejectQtBodyDto,
} from './dto/qt.dto';
import { Nx02QtService } from './qt.service';

@Controller('nx02')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QtController {
  constructor(private readonly svc: Nx02QtService) {}

  /** §3.1 採購工作台 RFQ list — 任意登入 user */
  @Get('rfq/list-for-purchase')
  list(@CurrentUser() user: RequestUser, @Query() q: ListRfqQueryDto) {
    return this.svc.listRfqsForPurchase(user, q);
  }

  /** §3.2 新增 QT — 限 PURCHASE / ADMIN */
  @Post('qt')
  @Roles('ADMIN', 'PURCHASE')
  addQt(@CurrentUser() user: RequestUser, @Body() dto: CreateQtDto) {
    return this.svc.addQt(user, dto);
  }

  /** §3.3 採用 QT — 限 PURCHASE / ADMIN */
  @Post('qt/:id/adopt')
  @Roles('ADMIN', 'PURCHASE')
  adoptQt(@CurrentUser() user: RequestUser, @Param('id') qtId: string) {
    return this.svc.adoptQt(user, qtId);
  }

  /** §3.4 拒絕單筆 QT — 限 PURCHASE / ADMIN */
  @Post('qt/:id/reject')
  @Roles('ADMIN', 'PURCHASE')
  rejectQt(
    @CurrentUser() user: RequestUser,
    @Param('id') qtId: string,
    @Body() dto: RejectQtBodyDto,
  ) {
    return this.svc.rejectQt(user, qtId, dto);
  }

  /** §3.5 取消整個 RFQ — 限 PURCHASE / ADMIN */
  @Post('rfq/:id/cancel')
  @Roles('ADMIN', 'PURCHASE')
  cancelRfq(
    @CurrentUser() user: RequestUser,
    @Param('id') rfqId: string,
    @Body() dto: CancelRfqBodyDto,
  ) {
    return this.svc.cancelRfq(user, rfqId, dto);
  }
}
