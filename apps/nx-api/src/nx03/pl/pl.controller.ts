// apps/nx-api/src/nx03/pl/pl.controller.ts
// NX03 Pl controller（包貨單）
// 6 endpoints（無 addItem/removeItem、items 從 pkId 自動轉、不允許手動加減）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';

import { CreatePlDto, PatchPlItemDto, UpdatePlDto } from './dto/pl.dto';
import { PlService } from './pl.service';

@Controller('nx03/pl')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PlController {
  constructor(private readonly svc: PlService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchPlItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePlDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePlDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
