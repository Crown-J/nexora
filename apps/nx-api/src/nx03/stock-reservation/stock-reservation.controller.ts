// apps/nx-api/src/nx03/stock-reservation/stock-reservation.controller.ts
// B2 庫存反查 API
//
// Access control（B2-impl §2.4 拍板 (a)）：
//   開放給所有登入 user（純讀 + multi-tenant 已隔離）
//   只走 JwtAuthGuard，不加 @Roles

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { GetReservationsQueryDto, GetStockSummaryQueryDto } from './dto/stock-reservation.dto';
import { Nx03StockReservationService } from './stock-reservation.service';

@Controller('nx03/stock')
@UseGuards(JwtAuthGuard)
export class StockReservationController {
  constructor(private readonly svc: Nx03StockReservationService) {}

  /** §3.1 庫存總覽 — 三個數字 + 元資料 */
  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser, @Query() q: GetStockSummaryQueryDto) {
    return this.svc.getStockSummary(user, q.partId.trim(), q.warehouseId.trim());
  }

  /** §3.2 承諾來源反查 — 接龍鎖完整鏈 */
  @Get('reservations')
  getReservations(@CurrentUser() user: RequestUser, @Query() q: GetReservationsQueryDto) {
    return this.svc.getReservations(user, q.partId.trim(), q.warehouseId.trim());
  }
}
