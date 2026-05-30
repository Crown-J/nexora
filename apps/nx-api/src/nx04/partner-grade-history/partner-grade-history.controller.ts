// apps/nx-api/src/nx04/partner-grade-history/partner-grade-history.controller.ts
// NX04-M2 §A C5：客戶等級變更核可 controller
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { Permission } from '../../shared/decorators/permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import {
  CreateGradeChangeRequestDto,
  ListGradeChangeQueryDto,
  RejectGradeChangeDto,
} from './dto/partner-grade-history.dto';
import { PartnerGradeHistoryService } from './partner-grade-history.service';

@Controller('nx04/partner-grade-history')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerGradeHistoryController {
  constructor(private readonly svc: PartnerGradeHistoryService) {}

  @Get()
  @Permission('sale.customer.grade-change.request', 'sale.customer.grade-change.approve')
  list(@CurrentUser() user: RequestUser, @Query() q: ListGradeChangeQueryDto) {
    return this.svc.list(user, q);
  }

  @Post('request')
  @Permission('sale.customer.grade-change.request')
  request(@CurrentUser() user: RequestUser, @Body() dto: CreateGradeChangeRequestDto) {
    return this.svc.request(user, dto);
  }

  @Get(':id')
  @Permission('sale.customer.grade-change.request', 'sale.customer.grade-change.approve')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /// v1.2 §6.4：核可變更等級 → OWNER 專屬權限 grade-change.approve
  @Post(':id/approve')
  @Permission('sale.customer.grade-change.approve')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.approve(user, id);
  }

  @Post(':id/reject')
  @Permission('sale.customer.grade-change.approve')
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RejectGradeChangeDto,
  ) {
    return this.svc.reject(user, id, dto);
  }
}
