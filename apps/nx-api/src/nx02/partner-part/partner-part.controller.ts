// apps/nx-api/src/nx02/partner-part/partner-part.controller.ts
// NX02 PartnerPart controller（partner ↔ part 中間表 CRUD、5 endpoints）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePartnerPartDto,
  PartnerPartListQueryDto,
  UpdatePartnerPartDto,
} from './dto/partner-part.dto';
import { PartnerPartService } from './partner-part.service';

@Controller('nx02/partner-part')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PartnerPartController {
  constructor(private readonly svc: PartnerPartService) {}

  @Get()
  @Permission('purchase.vendor.list', 'purchase.product.list')
  list(@CurrentUser() user: RequestUser, @Query() q: PartnerPartListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('purchase.vendor.view', 'purchase.product.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.vendor.edit', 'purchase.product.edit')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartnerPartDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.vendor.edit', 'purchase.product.edit')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerPartDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.vendor.edit', 'purchase.product.edit')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
