// apps/nx-api/src/nx03/conversion/conversion.controller.ts
// NX03 Conversion controller（重組 M / 分解 D 共用、5 endpoints）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';

import { CreateConversionDto, UpdateConversionDto } from './dto/conversion.dto';
import { ConversionService } from './conversion.service';

@Controller('nx03/conversion')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class ConversionController {
  constructor(private readonly svc: ConversionService) {}

  @Get()
  @Permission('inventory.conversion.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('inventory.conversion.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('inventory.conversion.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateConversionDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('inventory.conversion.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateConversionDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('inventory.conversion.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
