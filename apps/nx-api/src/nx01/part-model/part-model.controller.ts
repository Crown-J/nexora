// apps/nx-api/src/nx01/part-model/part-model.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0 §2 / §6
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePartModelDto,
  ListPartModelQueryDto,
  UpdatePartModelDto,
} from './dto/part-model.dto';
import { PartModelService } from './part-model.service';

@Controller('nx01/part-models')
@UseGuards(JwtAuthGuard, RolesGuard)
// 規格 §6：PURCHASING + SALES 業務日常高頻使用、4 角色可 CRUD（對齊 NX01-17 part_relation 範式）
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
export class PartModelController {
  constructor(private readonly svc: PartModelService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartModelQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartModelDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartModelDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
