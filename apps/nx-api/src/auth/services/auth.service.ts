/**
 * File: apps/nx-api/src/auth/services/auth.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-002 / NX00-AUTH-003：Auth Service（login / me）
 *
 * Notes:
 * - 驗證帳密、簽發 JWT
 * - /auth/me 用 sub 查 nx00_user 回傳使用者資訊
 * - Prisma 回傳 camelCase 欄位（isActive/passwordHash/displayName...）
 */

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) { }

  /**
   * @CODE nxapi_nx00_auth_login_003
   *
   * 說明：
   * - 依 username 查 user
   * - 檢查 isActive
   * - bcryptjs compare(password, passwordHash)
   * - 簽發 JWT 回傳 token
   * - 登入成功更新 lastLoginAt（稽核）
   */
  async login(username: string, password: string) {
    if (!username || !password) {
      throw new BadRequestException('username/password required');
    }

    const uname = String(username).trim();
    if (!uname) throw new BadRequestException('username/password required');

    const user = await this.prisma.nx00User.findUnique({
      where: { username: uname },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      throw new UnauthorizedException('Invalid username or password');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });

    await this.prisma.nx00User.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.displayName ?? null,
      },
    };
  }

  /**
   * @CODE nxapi_nx00_auth_me_003
   *
   * 說明：
   * - JWT Guard 解析 sub 後，帶入 userId
   * - 查 nx00_user 回傳乾淨 DTO（不包含 passwordHash）
   */
  async me(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Token user not found');
    }

    const user = await this.prisma.nx00User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token user not found');
    }

    return {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email ?? null,
      phone: user.phone ?? null,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt ?? null,
    };
  }
}