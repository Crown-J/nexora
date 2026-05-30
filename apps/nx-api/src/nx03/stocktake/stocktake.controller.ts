// apps/nx-api/src/nx03/stocktake/stocktake.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';

import {
  CreateStockTakeDto,
  CreateStockTakeItemDto,
  DecideStockTakeApprovalDto,
  PatchStockTakeItemDto,
  UpdateStockTakeDto,
} from './dto/stocktake.dto';
import { StockTakeService } from './stocktake.service';

@Controller('nx03/stocktake')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class StockTakeController {
  constructor(private readonly svc: StockTakeService) {}

  @Get()
  @Permission('inventory.stocktake.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  @Permission('inventory.stocktake.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateStockTakeItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('inventory.stocktake.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchStockTakeItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('inventory.stocktake.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('inventory.stocktake.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('inventory.stocktake.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStockTakeDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('inventory.stocktake.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateStockTakeDto) {
    return this.svc.update(user, id, dto);
  }

  /// 送審（v1.2 §7.2 「送出盤點、進核可」）
  @Post(':id/submit-for-approval')
  @Permission('inventory.stocktake.edit')
  submitForApproval(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.submitForApproval(user, id);
  }

  /// 核可 / 退回（v1.2 §7.2 負責人核可後過帳）
  @Post(':id/decide-approval')
  @Permission('inventory.stocktake.approve', 'inventory.stocktake.post')
  decideApproval(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DecideStockTakeApprovalDto,
  ) {
    return this.svc.decideApproval(user, id, dto);
  }

  @Delete(':id')
  @Permission('inventory.stocktake.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
