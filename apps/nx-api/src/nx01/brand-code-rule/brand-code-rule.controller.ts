// apps/nx-api/src/nx01/brand-code-rule/brand-code-rule.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-11-brand-code-rule.md v1.0 §2 / §6
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { BrandCodeRuleService } from './brand-code-rule.service';
import {
  CreateBrandCodeRuleDto,
  ListBrandCodeRuleQueryDto,
  UpdateBrandCodeRuleDto,
} from './dto/brand-code-rule.dto';

@Controller('nx01/brand-code-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class BrandCodeRuleController {
  constructor(private readonly svc: BrandCodeRuleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListBrandCodeRuleQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBrandCodeRuleDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandCodeRuleDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
