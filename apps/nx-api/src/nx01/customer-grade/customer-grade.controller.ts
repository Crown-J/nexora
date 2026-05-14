// apps/nx-api/src/nx01/customer-grade/customer-grade.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0 §2 / §6
// Crown 拍 Q1=A：補 PATCH endpoint、OWNER 可改 marginPct + name + sortNo + isActive
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CustomerGradeService } from './customer-grade.service';
import {
  ListCustomerGradeQueryDto,
  UpdateCustomerGradeDto,
} from './dto/customer-grade.dto';

@Controller('nx01/customer-grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class CustomerGradeController {
  constructor(private readonly svc: CustomerGradeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListCustomerGradeQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /**
   * 規格 §6 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive
   * 不開放 POST / DELETE：A/B/C/D 4 級固定、由 seed 維護、tenant 不可加 / 刪
   */
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerGradeDto,
  ) {
    return this.svc.update(user, id, dto);
  }
}
