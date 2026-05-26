// apps/nx-api/src/nx01/role-view/role-view.controller.ts
/**
 * RoleView Controller（補後端軌：職務↔畫面權限、路由 nx01/role-views）
 * 權限 SYSADMIN / OWNER；停用走 @Delete soft delete。
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateRoleViewDto, ListRoleViewQueryDto, UpdateRoleViewDto } from './dto/role-view.dto';
import { RoleViewService } from './role-view.service';

@Controller('nx01/role-views')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class RoleViewController {
  constructor(private readonly svc: RoleViewService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListRoleViewQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoleViewDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRoleViewDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
