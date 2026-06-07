import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import {
  CreatePartDto,
  ListPartQueryDto,
  PreviewPartCodeDto,
  UpdatePartDto,
} from './dto/part.dto';
import { PartService } from './part.service';

@Controller('nx01/parts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartController {
  constructor(private readonly svc: PartService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartQueryDto) {
    return this.svc.list(user, q);
  }

  /**
   * Crown Q7=B：part.code 拼接邏輯走後端、前端 onChange 呼叫此端點預覽
   * 對齊規格 §5 + Crown 業界 muscle memory（UNK 佔位）
   */
  @Post('preview-code')
  async previewCode(@CurrentUser() user: RequestUser, @Body() dto: PreviewPartCodeDto) {
    const tenantId = requireTenantId(user);
    const code = await this.svc.previewCode({
      tenantId,
      codeRuleId: dto.codeRuleId,
      segs: [dto.seg1, dto.seg2, dto.seg3, dto.seg4, dto.seg5],
      // W6-Phase 5：brandId 為主、舊 partBrandId（兼容）值已是 brand.id
      brandId: dto.brandId ?? dto.partBrandId ?? null,
      countryId: dto.countryId ?? null,
    });
    return { code };
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePartDto) {
    return this.svc.update(user, id, dto);
  }

  /**
   * M2-b：依成本重算建議售價（前端「依成本重算」按鈕對應端點）。
   * 系統算為主（cost × customer_grade.marginPct）、可手動微調走 PATCH。
   */
  @Post(':id/recalc-prices')
  recalcPrices(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.recalcPricesByCost(user, id);
  }

  /**
   * 02 對齊第二批前端收尾軌 FE-CP6 2026-06-07：通用件查詢自動帶替代品（總經理核心體驗）
   * 業務範式：查一顆零件 → 列出同群組所有可替代零件 + 庫存合計
   * 用途：銷貨單開單時、零件斷貨時、業務員快速找替代品
   */
  @Get(':id/compat-alternatives')
  compatAlternatives(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.findCompatAlternatives(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
