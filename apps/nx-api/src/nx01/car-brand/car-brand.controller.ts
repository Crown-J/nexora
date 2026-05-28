// apps/nx-api/src/nx01/car-brand/car-brand.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-12-car-brand.md v1.0 §2 / §6
// Crown 拍 Q2=A：對齊 part-brand 既有 NX01 範式（歷史已清、前端 commit 3.D 改 path）
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CarBrandService } from './car-brand.service';
import {
  CreateCarBrandDto,
  ListCarBrandQueryDto,
  UpdateCarBrandDto,
} from './dto/car-brand.dto';

@Controller('nx01/car-brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class CarBrandController {
  constructor(private readonly svc: CarBrandService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListCarBrandQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCarBrandDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCarBrandDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
