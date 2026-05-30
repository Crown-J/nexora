import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';

import {
  CreatePurchaseReturnDto,
  CreatePurchaseReturnItemDto,
  PatchPurchaseReturnItemDto,
  UpdatePurchaseReturnDto,
} from './dto/purchase-return.dto';
import { PurchaseReturnService } from './purchase-return.service';

@Controller('nx02/purchase-return')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class PurchaseReturnController {
  constructor(private readonly svc: PurchaseReturnService) {}

  @Get()
  @Permission('purchase.pr.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx02ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  @Permission('purchase.pr.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreatePurchaseReturnItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('purchase.pr.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchPurchaseReturnItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('purchase.pr.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('purchase.pr.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.pr.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePurchaseReturnDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.pr.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePurchaseReturnDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.pr.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
