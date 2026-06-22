// apps/nx-api/src/nx01/warehouse-zone/warehouse-zone.controller.ts
// 倉庫分區 controller（2026-06-22 執行長拍板新增四層架構）
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateWarehouseZoneDto,
  ListWarehouseZoneQueryDto,
  UpdateWarehouseZoneDto,
} from './dto/warehouse-zone.dto';
import { WarehouseZoneService } from './warehouse-zone.service';

@Controller('nx01/warehouse-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class WarehouseZoneController {
  constructor(private readonly svc: WarehouseZoneService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListWarehouseZoneQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWarehouseZoneDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateWarehouseZoneDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
