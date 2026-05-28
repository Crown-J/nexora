import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreatePartnerDto, ListPartnerQueryDto, UpdatePartnerDto } from './dto/partner.dto';
import { PartnerService } from './partner.service';

@Controller('nx01/partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerController {
  constructor(private readonly svc: PartnerService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartnerQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartnerDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.svc.update(user, id, dto);
  }

  /**
   * M2-c：依付款條件重算供應商等級（前端「依付款條件重算」按鈕對應端點）。
   * 純供應商 partner_type='S' 用為主、業務也可手動指派 supplierGradeId 覆寫。
   */
  @Post(':id/recalc-supplier-grade')
  recalcSupplierGrade(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.recalcSupplierGradeByPaymentTerm(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
