// apps/nx-api/src/nx01/part-group/part-group.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0 (part_group 子段)
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePartGroupDto,
  ListPartGroupQueryDto,
  UpdatePartGroupDto,
} from './dto/part-group.dto';
import { PartGroupService } from './part-group.service';

@Controller('nx01/part-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartGroupController {
  constructor(private readonly svc: PartGroupService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartGroupQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartGroupDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartGroupDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
