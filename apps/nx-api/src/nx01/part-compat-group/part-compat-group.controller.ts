// apps/nx-api/src/nx01/part-compat-group/part-compat-group.controller.ts
// 02 對齊第二批 C 軌 CP2-c 2026-06-06：通用件群組 controller（group + member 衛星表）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateGroupMemberDto,
  CreatePartCompatGroupDto,
  ListPartCompatGroupQueryDto,
  UpdateGroupMemberDto,
  UpdatePartCompatGroupDto,
} from './dto/part-compat-group.dto';
import { PartCompatGroupService } from './part-compat-group.service';

@Controller('nx01/part-compat-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartCompatGroupController {
  constructor(private readonly svc: PartCompatGroupService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPartCompatGroupQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartCompatGroupDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePartCompatGroupDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }

  // ───── member 衛星表 ─────
  @Get(':id/members')
  listMembers(@CurrentUser() user: RequestUser, @Param('id') groupId: string) {
    return this.svc.listMembers(user, groupId);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: RequestUser,
    @Param('id') groupId: string,
    @Body() dto: CreateGroupMemberDto,
  ) {
    return this.svc.addMember(user, groupId, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateGroupMemberDto,
  ) {
    return this.svc.updateMember(user, groupId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.svc.removeMember(user, groupId, memberId);
  }
}
