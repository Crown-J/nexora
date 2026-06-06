// apps/nx-api/src/nx01/partner-address/partner-address.controller.ts
// 02 對齊第二批 A 軌 CP3 2026-06-06：partner_address sub-resource controller

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreatePartnerAddressDto, UpdatePartnerAddressDto } from './dto/partner-address.dto';
import { PartnerAddressService } from './partner-address.service';

@Controller('nx01/partners/:partnerId/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerAddressController {
  constructor(private readonly svc: PartnerAddressService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('partnerId') partnerId: string) {
    return this.svc.list(user, partnerId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Body() dto: CreatePartnerAddressDto,
  ) {
    return this.svc.create(user, partnerId, dto);
  }

  @Patch(':addressId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdatePartnerAddressDto,
  ) {
    return this.svc.update(user, partnerId, addressId, dto);
  }

  @Delete(':addressId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.svc.remove(user, partnerId, addressId);
  }
}
