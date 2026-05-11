import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CustomerGradeService } from './customer-grade.service';
import { ListCustomerGradeQueryDto } from './dto/customer-grade.dto';

@Controller('nx01/customer-grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class CustomerGradeController {
  constructor(private readonly svc: CustomerGradeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListCustomerGradeQueryDto) {
    return this.svc.list(user, q);
  }
}
