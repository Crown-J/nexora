// apps/nx-api/src/nx04/partner-grade-history/partner-grade-history.controller.ts
// NX04-M2 §A C5：客戶等級變更核可 controller
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateGradeChangeRequestDto,
  ListGradeChangeQueryDto,
  RejectGradeChangeDto,
} from './dto/partner-grade-history.dto';
import { PartnerGradeHistoryService } from './partner-grade-history.service';

@Controller('nx04/partner-grade-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartnerGradeHistoryController {
  constructor(private readonly svc: PartnerGradeHistoryService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListGradeChangeQueryDto) {
    return this.svc.list(user, q);
  }

  @Post('request')
  request(@CurrentUser() user: RequestUser, @Body() dto: CreateGradeChangeRequestDto) {
    return this.svc.request(user, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /// ⚠️ FU-sales-lite-04：approve 應 OWNER only、本軌 class level @Roles 未細分
  @Post(':id/approve')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.approve(user, id);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RejectGradeChangeDto,
  ) {
    return this.svc.reject(user, id, dto);
  }
}
