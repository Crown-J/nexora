// apps/nx-api/src/nx04/bundle/bundle.controller.ts
// F2 組合套餐 2026-06-09：CRUD endpoints（apply-to-SO 走 SoController）

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { BundleService } from './bundle.service';
import {
  CreateBundleDto,
  ListBundleQueryDto,
  ReplaceBundleItemsDto,
  UpdateBundleDto,
} from './dto/bundle.dto';

@Controller('nx04/bundle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class BundleController {
  constructor(private readonly svc: BundleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListBundleQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBundleDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateBundleDto) {
    return this.svc.update(user, id, dto);
  }

  @Put(':id/items')
  replaceItems(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReplaceBundleItemsDto,
  ) {
    return this.svc.replaceItems(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
