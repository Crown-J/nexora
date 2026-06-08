// apps/nx-api/src/nx01/discount-code/discount-code.controller.ts
// F1-A 銷貨優惠價子系統 2026-06-08：折扣代碼 5 endpoint（業務員自助管理 DEFECT/USED/VIP/BULK 等代碼）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { DiscountCodeService } from './discount-code.service';
import {
  CreateDiscountCodeDto,
  ListDiscountCodeQueryDto,
  UpdateDiscountCodeDto,
} from './dto/discount-code.dto';

@Controller('nx01/discount-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class DiscountCodeController {
  constructor(private readonly svc: DiscountCodeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListDiscountCodeQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDiscountCodeDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateDiscountCodeDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
