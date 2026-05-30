// apps/nx-api/src/nx01/permission/permission.controller.ts
// v1.2 對齊軌 A+B：權限目錄查詢 + 角色權限管理 controller

import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { SetRolePermissionsDto } from './dto/permission.dto';
import { PermissionService } from './permission.service';

@Controller('nx01/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionController {
  constructor(private readonly svc: PermissionService) {}

  /// 列出系統權限目錄（給「設定→角色與權限」樹狀勾選 UI 用）
  @Get('catalog')
  @Roles('SYSADMIN', 'OWNER')
  catalog() {
    return this.svc.listCatalog();
  }

  /// 當前 user 擁有的所有權限 codes（給前端 useHasPermission hook）
  /// 任何登入 user 都可呼叫（沒有額外 @Roles）
  @Get('mine')
  mine(@CurrentUser() user: RequestUser) {
    return this.svc.listMine(user);
  }

  /// 列指定角色的權限集合（給 UI 編輯預填 checkbox 用）
  @Get('role/:roleId')
  @Roles('SYSADMIN', 'OWNER')
  forRole(@CurrentUser() user: RequestUser, @Param('roleId') roleId: string) {
    return this.svc.listForRole(user, roleId);
  }

  /// 替換指定角色的權限集合（PUT 語意、UI 儲存按鈕）
  @Put('role/:roleId')
  @Roles('SYSADMIN', 'OWNER')
  setForRole(
    @CurrentUser() user: RequestUser,
    @Param('roleId') roleId: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.svc.setForRole(user, roleId, dto.permissionCodes);
  }
}
