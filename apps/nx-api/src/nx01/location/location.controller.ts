// apps/nx-api/src/nx01/location/location.controller.ts
/**
 * Location Controller（補後端軌：仿 warehouse、路由 nx01/locations）
 * 權限 SYSADMIN / OWNER；停用走 @Delete soft delete。
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateLocationDto, ListLocationQueryDto, UpdateLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

@Controller('nx01/locations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class LocationController {
  constructor(private readonly svc: LocationService) {}

  @Get()
  @Permission('inventory.location.list', 'master.warehouse.list')
  list(@CurrentUser() user: RequestUser, @Query() q: ListLocationQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('inventory.location.view', 'master.warehouse.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('inventory.location.create', 'master.warehouse.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLocationDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('inventory.location.edit', 'master.warehouse.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('inventory.location.delete', 'master.warehouse.edit')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
