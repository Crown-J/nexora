import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { Nx07NoFinanceGuard } from '../../shared/nx07/nx07-no-finance.guard';
import { Nx07ProPlanGuard } from '../../shared/nx07/nx07-pro-plan.guard';

import { CreatePayrollDto, PatchPayrollDto } from './payroll.dto';
import { Nx07PayrollService } from './payroll.service';

@Controller('nx07/payroll')
@UseGuards(JwtAuthGuard, Nx07ProPlanGuard, Nx07NoFinanceGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'HR')
export class Nx07PayrollController {
  constructor(private readonly svc: Nx07PayrollService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx07ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePayrollDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchPayrollDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
