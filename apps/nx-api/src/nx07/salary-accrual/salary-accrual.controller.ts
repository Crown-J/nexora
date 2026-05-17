// apps/nx-api/src/nx07/salary-accrual/salary-accrual.controller.ts
// NX07 SalaryAccrual controller（手動觸發 KPI 業績加給套用）

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx07ProPlanGuard } from '../../shared/nx07/nx07-pro-plan.guard';

import { Nx07SalaryAccrualService } from './salary-accrual.service';

class ApplyKpiBonusDto {
  @IsString()
  @MaxLength(15)
  salaryRecordId!: string;
}

@Controller('nx07/salary-accrual')
@UseGuards(JwtAuthGuard, RolesGuard, Nx07ProPlanGuard)
@Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
export class Nx07SalaryAccrualController {
  constructor(private readonly svc: Nx07SalaryAccrualService) {}

  /**
   * ⭐⭐⭐ 業界改革 #2 NX04 業績 → NX07 薪資加給套用（HR_ADMIN 月底手動觸發）。
   * 對齊 NX05 ArStatement / NX08 ETL 範式（外部 cron 或人工觸發、不裝 @nestjs/schedule）。
   */
  @Post('apply-kpi-bonus')
  applyKpiBonus(@CurrentUser() user: RequestUser, @Body() dto: ApplyKpiBonusDto) {
    return this.svc.applyKpiBonus(user, dto);
  }
}
