// apps/nx-api/src/nx01/supplier-grade/supplier-grade.controller.ts
// LITE 階段 1 M2-c：供應商分級 controller。
// 不開放 POST / DELETE：A/B/C/D 4 級固定、由 seed 維護、tenant 不可加/刪（對齊 customer-grade）。
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  ListSupplierGradeQueryDto,
  UpdateSupplierGradeDto,
} from './dto/supplier-grade.dto';
import { SupplierGradeService } from './supplier-grade.service';

@Controller('nx01/supplier-grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class SupplierGradeController {
  constructor(private readonly svc: SupplierGradeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListSupplierGradeQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierGradeDto,
  ) {
    return this.svc.update(user, id, dto);
  }
}
