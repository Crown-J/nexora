// apps/nx-api/src/nx01/location/location.controller.ts
/**
 * Location Controller（補後端軌：仿 warehouse、路由 nx01/locations）
 * 權限 SYSADMIN / OWNER；停用走 @Delete soft delete。
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateLocationDto, ListLocationQueryDto, UpdateLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

@Controller('nx01/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class LocationController {
  constructor(private readonly svc: LocationService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListLocationQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLocationDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
