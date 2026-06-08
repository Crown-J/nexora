// apps/nx-api/src/nx04/promotion/promotion.controller.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 CRUD + 全域即期門檻 endpoint

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePromotionDto,
  ListPromotionQueryDto,
  ReplacePromotionScopesDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

@Controller('nx04/promotion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PromotionController {
  constructor(private readonly svc: PromotionService) {}

  // 全域設定（必須放在 :id 之前、否則被吃路徑）
  @Get('settings/shelf-life-warning-days')
  getShelfLifeWarningDays(@CurrentUser() user: RequestUser) {
    return this.svc.getShelfLifeWarningDays(user).then((days) => ({ shelfLifeWarningDays: days }));
  }

  @Put('settings/shelf-life-warning-days')
  setShelfLifeWarningDays(
    @CurrentUser() user: RequestUser,
    @Body() body: { shelfLifeWarningDays: number },
  ) {
    return this.svc.setShelfLifeWarningDays(user, body.shelfLifeWarningDays);
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPromotionQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePromotionDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.svc.update(user, id, dto);
  }

  @Put(':id/scopes')
  replaceScopes(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReplacePromotionScopesDto,
  ) {
    return this.svc.replaceScopes(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
