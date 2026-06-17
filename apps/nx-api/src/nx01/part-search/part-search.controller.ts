// apps/nx-api/src/nx01/part-search/part-search.controller.ts
// F2 料號即時搜尋 controller（執行長 2026-06-17 拍板）
//
// 全公司任何登入使用者可呼叫：
//   - 只掛 JwtAuthGuard、不掛 RolesGuard / @Roles
//   - 對應 RolesGuard 第 40 行：「沒設角色 → 直接放行」
//
// 七支 endpoint 全部 read-only：
//   GET    /nx01/part-search                       — 主搜尋（四欄篩選、四欄全空拒收）
//   GET    /nx01/part-search/:id/detail            — 基本資料 + 正廠對應料號
//   GET    /nx01/part-search/:id/stock-summary     — 庫存概況（公司總 + 各倉位）
//   GET    /nx01/part-search/:id/purchase-history  — 進貨紀錄+比價（近 50 筆）
//   GET    /nx01/part-search/:id/sales-history     — 銷貨+報價（成交+未成交）+ ABCD 建議報價
//   GET    /nx01/part-search/:id/stock-history     — 庫存出入/調撥/盤點（近 100 筆）
//   GET    /nx01/part-search/:id/related           — 相關零件（PartRelation 雙向、Q3=A 不分子類型）
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { PartSearchQueryDto } from './dto/part-search.dto';
import { PartSearchService } from './part-search.service';

@Controller('nx01/part-search')
@UseGuards(JwtAuthGuard)
export class PartSearchController {
  constructor(private readonly svc: PartSearchService) {}

  @Get()
  search(@CurrentUser() user: RequestUser, @Query() q: PartSearchQueryDto) {
    return this.svc.search(user, q);
  }

  @Get(':id/detail')
  getDetail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getDetail(user, id);
  }

  @Get(':id/stock-summary')
  getStockSummary(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getStockSummary(user, id);
  }

  @Get(':id/purchase-history')
  getPurchaseHistory(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getPurchaseHistory(user, id);
  }

  @Get(':id/sales-history')
  getSalesHistory(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getSalesHistory(user, id);
  }

  @Get(':id/stock-history')
  getStockHistory(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getStockHistory(user, id);
  }

  @Get(':id/related')
  getRelatedParts(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getRelatedParts(user, id);
  }
}
