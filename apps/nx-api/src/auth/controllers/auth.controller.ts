/**
 * File: apps/nx-api/src/auth/controllers/auth.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-CTRL-001：Auth Controller（/auth/login、/auth/me）
 *
 * Notes:
 * - /auth/login：取得 JWT token
 * - /auth/me：驗證 token 並回傳使用者資料（不包含敏感欄位）
 */

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { JwtPayload } from '../strategies/jwt.strategy';
import { User } from '../../shared/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  /**
   * @CODE nxapi_auth_login_001
   */
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password, body.tenantCode);
  }

  /**
   * @CODE nxapi_auth_me_001
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User() payload: JwtPayload) {
    return this.auth.me(payload.sub);
  }

  /// v1.2 對齊軌 C-FU：強制改密碼（首次登入）
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @User() payload: JwtPayload,
    @Body() body: { oldPassword?: string; newPassword: string },
  ) {
    return this.auth.changePassword(payload.sub, body.oldPassword ?? '', body.newPassword);
  }
}