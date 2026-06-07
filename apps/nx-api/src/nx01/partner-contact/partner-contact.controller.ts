// apps/nx-api/src/nx01/partner-contact/partner-contact.controller.ts
// 02 第三批 T2 2026-06-07：partner 聯絡窗口 sub-resource controller

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreatePartnerContactDto, UpdatePartnerContactDto } from './dto/partner-contact.dto';
import { PartnerContactService } from './partner-contact.service';

@Controller('nx01/partners/:partnerId/contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerContactController {
  constructor(private readonly svc: PartnerContactService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('partnerId') partnerId: string) {
    return this.svc.list(user, partnerId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Body() dto: CreatePartnerContactDto,
  ) {
    return this.svc.create(user, partnerId, dto);
  }

  @Patch(':contactId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdatePartnerContactDto,
  ) {
    return this.svc.update(user, partnerId, contactId, dto);
  }

  @Delete(':contactId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('partnerId') partnerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.svc.remove(user, partnerId, contactId);
  }
}
