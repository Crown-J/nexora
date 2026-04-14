import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx08ProPlanGuard } from '../../shared/nx08/nx08-pro-plan.guard';

import { CreateDailyReportDto, PatchDailyReportDto } from './daily-report.dto';
import { Nx08DailyReportService } from './daily-report.service';
import { Nx08DailyReportListQueryDto } from './nx08-daily-report-list-query.dto';

@Controller('nx08/daily-report')
@UseGuards(JwtAuthGuard, Nx08ProPlanGuard)
export class Nx08DailyReportController {
  constructor(private readonly svc: Nx08DailyReportService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx08DailyReportListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDailyReportDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.complete(user, id);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchDailyReportDto) {
    return this.svc.patch(user, id, dto);
  }
}
