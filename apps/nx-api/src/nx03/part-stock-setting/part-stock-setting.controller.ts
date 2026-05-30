// apps/nx-api/src/nx03/part-stock-setting/part-stock-setting.controller.ts
// NX03 PartStockSetting CRUD（料件 × 倉 安全量設定）
// Roles 暫保守 SYSADMIN/OWNER、業務角色擴展待 Crown 拍板

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePartStockSettingDto,
  PartStockSettingListQueryDto,
  UpdatePartStockSettingDto,
} from './dto/part-stock-setting.dto';
import { PartStockSettingService } from './part-stock-setting.service';

@Controller('nx03/part-stock-setting')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartStockSettingController {
  constructor(private readonly svc: PartStockSettingService) {}

  @Get()
  @Permission('inventory.part-stock-setting.list')
  list(@CurrentUser() user: RequestUser, @Query() q: PartStockSettingListQueryDto) {
    return this.svc.list(user, q);
  }

  // ⚠️ 必須宣告在 @Get(':id') 之前、避免 NestJS 路由衝突
  @Get('suggest-location/:partId/:warehouseId')
  @Permission('inventory.part-stock-setting.view')
  suggestLocation(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.svc.suggestLocation(user, partId, warehouseId);
  }

  @Get(':id')
  @Permission('inventory.part-stock-setting.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('inventory.part-stock-setting.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartStockSettingDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('inventory.part-stock-setting.edit')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartStockSettingDto,
  ) {
    return this.svc.update(user, id, dto);
  }
}
