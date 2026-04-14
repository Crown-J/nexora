import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';

import {
  CreateSalesReturnDto,
  CreateSalesReturnItemDto,
  PatchSalesReturnItemDto,
  UpdateSalesReturnDto,
} from './dto/sales-return.dto';
import { SalesReturnService } from './sales-return.service';

@Controller('nx04/sales-return')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SalesReturnController {
  constructor(private readonly svc: SalesReturnService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx04ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateSalesReturnItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchSalesReturnItemDto,
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
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSalesReturnDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateSalesReturnDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('voidReason') voidReason?: string) {
    return this.svc.softDelete(user, id, voidReason);
  }
}
