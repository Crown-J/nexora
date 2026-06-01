// apps/nx-api/src/platform-auth/controllers/platform-auth.controller.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台超管登入 / me / 改密 endpoint
//
// 路由：
// - POST /platform/auth/login           無需 token
// - GET  /platform/auth/me              要 platform token
// - POST /platform/auth/change-password 要 platform token

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { PlatformAdminGuard } from '../../shared/guards/platform-admin.guard';
import { PlatformChangePasswordDto } from '../dto/platform-change-password.dto';
import { PlatformLoginDto } from '../dto/platform-login.dto';
import { PlatformAuthService } from '../services/platform-auth.service';
import type { PlatformRequestUser } from '../strategies/platform-jwt.strategy';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) { }

  @Post('login')
  async login(@Body() body: PlatformLoginDto) {
    return this.auth.login(body.account, body.password);
  }

  @UseGuards(PlatformAdminGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user as PlatformRequestUser;
    return this.auth.me(user.sub);
  }

  @UseGuards(PlatformAdminGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() body: PlatformChangePasswordDto,
  ) {
    const user = req.user as PlatformRequestUser;
    return this.auth.changePassword(user.sub, body.oldPassword ?? '', body.newPassword);
  }
}
