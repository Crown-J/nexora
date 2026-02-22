// C:\nexora\apps\nx-api\src\auth\auth.controller.ts
// AuthController：/auth/login 取得 token、/auth/me 驗證 token 並回傳使用者資料

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from '@nestjs/common'; // ✅ 這行其實不用也行（可以直接刪掉 Req 用法）

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt.strategy';
import { User } from './user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User() payload: JwtPayload) {
    return this.authService.me(payload.sub);
  }
}
