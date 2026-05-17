// apps/nx-api/src/nx02/partner-part/partner-part.controller.ts
// NX02 PartnerPart controller（partner ↔ part 中間表 CRUD、5 endpoints）
// 對齊 nx02-overview §4 + Crown 拍板 partner_type=S application guard

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePartnerPartDto,
  PartnerPartListQueryDto,
  UpdatePartnerPartDto,
} from './dto/partner-part.dto';
import { PartnerPartService } from './partner-part.service';

@Controller('nx02/partner-part')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PartnerPartController {
  constructor(private readonly svc: PartnerPartService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: PartnerPartListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartnerPartDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerPartDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
