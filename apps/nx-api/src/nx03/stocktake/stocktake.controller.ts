// apps/nx-api/src/nx03/stocktake/stocktake.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class StockTakeController {
  constructor(private readonly svc: StockTakeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateStockTakeItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchStockTakeItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStockTakeDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateStockTakeDto) {
    return this.svc.update(user, id, dto);
  }

  // NX03-STOCK-LITE M2 核可流程：ADJUSTING → submit-for-approval → (auto-pass 或 等簽核) → POSTED
  @Post(':id/submit-for-approval')
  submitForApproval(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.submitForApproval(user, id);
  }

  @Post(':id/decide-approval')
  decideApproval(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DecideStockTakeApprovalDto,
  ) {
    return this.svc.decideApproval(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
