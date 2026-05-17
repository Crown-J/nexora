// apps/nx-api/src/nx02/purchase-suggestion/purchase-suggestion.controller.ts
// NX02 PurchaseSuggestion controller（採購建議單列表）
// 對齊 overview §3.3 + Crown Q20 列表式

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PurchaseSuggestionListQueryDto } from './dto/purchase-suggestion.dto';
import { PurchaseSuggestionService } from './purchase-suggestion.service';

@Controller('nx02/purchase-suggestion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PurchaseSuggestionController {
  constructor(private readonly svc: PurchaseSuggestionService) {}

  /**
   * 採購建議單列表
   * - 純 read-only（待處理 Nx02Demand）
   * - 客訂優先排序（O→S、demandType desc）
   * - 可按 supplierId 過濾（混合範式：PartnerPart 主檔 + 90 天歷史 PoItem）
   */
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: PurchaseSuggestionListQueryDto) {
    return this.svc.list(user, q);
  }
}
