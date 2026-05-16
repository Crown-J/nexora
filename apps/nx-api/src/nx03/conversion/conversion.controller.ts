// apps/nx-api/src/nx03/conversion/conversion.controller.ts
// NX03 Conversion controller（重組 M / 分解 D 共用、5 endpoints）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';

import { CreateConversionDto, UpdateConversionDto } from './dto/conversion.dto';
import { ConversionService } from './conversion.service';

@Controller('nx03/conversion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class ConversionController {
  constructor(private readonly svc: ConversionService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx03ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateConversionDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateConversionDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
