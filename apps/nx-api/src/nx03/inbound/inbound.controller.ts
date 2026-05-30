import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';

import { CreateInboundDto, CreateInboundItemDto, PatchInboundItemDto, UpdateInboundDto } from './dto/inbound.dto';
import { InboundService } from './inbound.service';

@Controller('nx03/inbound')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.workstation.receiving')
export class InboundController {
  constructor(private readonly svc: InboundService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateInboundItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchInboundItemDto,
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
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateInboundDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateInboundDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
