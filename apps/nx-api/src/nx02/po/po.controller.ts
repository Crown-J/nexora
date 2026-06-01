import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PoListQueryDto } from './dto/po.dto';

import { CreatePoDto, CreatePoItemDto, PatchPoItemDto, UpdatePoDto } from './dto/po.dto';
import { PoService } from './po.service';

@Controller('nx02/po')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class PoController {
  constructor(private readonly svc: PoService) {}

  @Get()
  @Permission('purchase.po.list')
  list(@CurrentUser() user: RequestUser, @Query() q: PoListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  @Permission('purchase.po.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreatePoItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('purchase.po.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchPoItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('purchase.po.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('purchase.po.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.po.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePoDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.po.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePoDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.po.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
