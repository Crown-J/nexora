// apps/nx-api/src/nx01/supplier-grade/supplier-grade.controller.ts
// LITE 階段 1 M2-c：供應商分級 controller。
// 05 批 T4 2026-06-07：半開放升級 — 開放 POST + DELETE、A/B/C/D 內建 service 端守不可刪。
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateSupplierGradeDto,
  ListSupplierGradeQueryDto,
  UpdateSupplierGradeDto,
} from './dto/supplier-grade.dto';
import { SupplierGradeService } from './supplier-grade.service';

@Controller('nx01/supplier-grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class SupplierGradeController {
  constructor(private readonly svc: SupplierGradeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListSupplierGradeQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierGradeDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierGradeDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
