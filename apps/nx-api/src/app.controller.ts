/**
 * File: apps/nx-api/src/app.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - CORE-API-APP-CTRL-001：最小測試入口（health check / RBAC debug）
 *
 * Notes:
 * - ⚠️ 不要佔用正式 API 路徑（例如 /users）
 * - /users 交給 UsersController
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

import { Roles } from './shared/decorators/roles.decorator';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @CODE nxapi_health_001
   *
   * 說明：
   * - 最基本健康檢查（不需要登入）
   */
  @Get('/health')
  health() {
    return { ok: true, service: 'nx-api', ts: new Date().toISOString() };
  }

  /**
   * @CODE nxapi_debug_rbac_admin_ping_001
   *
   * 說明：
   * - 必須登入（JWT）
   * - 必須具備 ADMIN 角色
   * - 用來驗證 RBAC / JWT 是否可用（不暴露敏感欄位）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('/debug/rbac/admin')
  async adminPing() {
    return { ok: true, role: 'ADMIN', ts: new Date().toISOString() };
  }

  /**
   * @CODE nxapi_debug_users_safe_preview_001
   *
   * 說明：
   * - 僅供 debug：確認 Prisma 可連線 + 基本查詢
   * - ✅ 只 select 安全欄位（不回 passwordHash）
   * - ⚠️ 路徑放在 /debug，避免和正式 /users 衝突
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('/debug/users')
  async debugUsers() {
    return this.prisma.nx00User.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}