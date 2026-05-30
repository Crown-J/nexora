import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';

import { CreateRrDto, CreateRrItemDto, PatchRrItemDto, UpdateRrDto } from './dto/rr.dto';
import { RrService } from './rr.service';

@Controller('nx02/rr')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class RrController {
  constructor(private readonly svc: RrService) {}

  @Get()
  @Permission('purchase.rr.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx02ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  @Permission('purchase.rr.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateRrItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('purchase.rr.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchRrItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('purchase.rr.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('purchase.rr.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.rr.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRrDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.rr.edit', 'purchase.rr.post')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRrDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.rr.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
