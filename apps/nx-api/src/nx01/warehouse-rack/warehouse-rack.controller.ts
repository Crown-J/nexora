// apps/nx-api/src/nx01/warehouse-rack/warehouse-rack.controller.ts
// 貨架 controller（2026-06-28 五層倉儲第四層：區域 → 貨架）
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateWarehouseRackDto,
  ListWarehouseRackQueryDto,
  UpdateWarehouseRackDto,
} from './dto/warehouse-rack.dto';
import { WarehouseRackService } from './warehouse-rack.service';

@Controller('nx01/warehouse-racks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class WarehouseRackController {
  constructor(private readonly svc: WarehouseRackService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListWarehouseRackQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWarehouseRackDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateWarehouseRackDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
