import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/module-access/module-access.guard';
import { RequiresModule } from '../../shared/module-access/requires-module.decorator';

import { Nx08MonthlyReportListQueryDto, Nx08MonthlyReportSummaryQueryDto } from './nx08-monthly-report-list-query.dto';
import { Nx08MonthlyReportService } from './monthly-report.service';

@Controller('nx08/monthly-report')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('NX08')
export class Nx08MonthlyReportController {
  constructor(private readonly svc: Nx08MonthlyReportService) {}

  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query() q: Nx08MonthlyReportSummaryQueryDto) {
    return this.svc.summary(user, q);
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx08MonthlyReportListQueryDto) {
    return this.svc.list(user, q);
  }
}
