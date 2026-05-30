// apps/nx-api/src/nx03/brand-allocation-rule/brand-allocation-rule.controller.ts
// NX03 BrandAllocationRule controller（AR 配比規則 CRUD、5 endpoints）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  BrandAllocationRuleListQueryDto,
  CreateBrandAllocationRuleDto,
  UpdateBrandAllocationRuleDto,
} from './dto/brand-allocation-rule.dto';
import { BrandAllocationRuleService } from './brand-allocation-rule.service';

@Controller('nx03/brand-allocation-rule')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('settings.system-param.edit')
export class BrandAllocationRuleController {
  constructor(private readonly svc: BrandAllocationRuleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: BrandAllocationRuleListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBrandAllocationRuleDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandAllocationRuleDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
