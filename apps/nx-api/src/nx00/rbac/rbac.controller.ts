/**
 * File: apps/nx-api/src/nx00/rbac/rbac.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-API-CTL-001：RBAC 管理 API（roles / members / search）
 *
 * Notes:
 * - 先用 JwtAuthGuard 保護（你後面要加 RolesGuard/ADMIN 限制也很容易）
 */

import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RbacService } from './rbac.service';
import { AddRoleMemberDto, OkDto, RoleListItemDto, RoleMembersDto, UserLiteDto } from './rbac.dto';

@UseGuards(JwtAuthGuard)
@Controller('nx00/rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  /**
   * @FUNCTION_CODE NX00-RBAC-API-CTL-001-F01
   * 說明：列出 Roles
   */
  @Get('roles')
  async listRoles(): Promise<RoleListItemDto[]> {
    return this.rbac.listRoles();
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-CTL-001-F02
   * 說明：取得 role members
   */
  @Get('roles/:roleId/members')
  async getRoleMembers(@Param('roleId') roleId: string): Promise<RoleMembersDto> {
    return this.rbac.getRoleMembers(roleId);
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-CTL-001-F03
   * 說明：新增 role member
   */
  @Post('roles/:roleId/members')
  async addRoleMember(
    @Param('roleId') roleId: string,
    @Body() dto: AddRoleMemberDto,
    @CurrentUser() me: any
  ): Promise<OkDto> {
    await this.rbac.addRoleMember(roleId, dto.userId, me?.id ?? null);
    return { ok: true };
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-CTL-001-F04
   * 說明：移除 role member
   */
  @Delete('roles/:roleId/members/:userId')
  async removeRoleMember(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string
  ): Promise<OkDto> {
    await this.rbac.removeRoleMember(roleId, userId);
    return { ok: true };
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-CTL-001-F05
   * 說明：搜尋 users（給 candidates）
   */
  @Get('users/search')
  async searchUsers(@Query('q') q = ''): Promise<UserLiteDto[]> {
    return this.rbac.searchUsers(q, 10);
  }
}