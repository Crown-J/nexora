/**
 * File: apps/nx-api/src/auth/auth.service.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-AUTH-002 / NX00-AUTH-003
 * Notes:
 * - 驗證帳密、簽發 JWT
 * - /auth/me 用 sub 查 nx00_user 回傳使用者資訊
 * - 使用 Prisma 回傳的 camelCase 欄位（isActive/passwordHash/displayName...）
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * @CODE nxapi_nx00_auth_login_003
   * 說明：
   * - 依 username 查 user
   * - 檢查 isActive
   * - bcryptjs compare(password, passwordHash)
   * - 簽發 JWT 回傳 token（統一回 token，前端最好接）
   * - 登入成功更新 lastLoginAt（可作稽核）
   */
  async login(username: string, password: string) {
    // 動作 001：基本防呆
    if (!username || !password) {
      throw new BadRequestException('username/password required');
    }

    // 動作 002：查 user
    const user = await (this.prisma as any).nx00User.findUnique({
      where: { username },
    });

    // 動作 003：找不到使用者 → 401
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 動作 004：停用帳號 → 401（注意：Prisma 欄位是 isActive）
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // 動作 005：passwordHash 防呆（避免 bcrypt.compare 噴錯）
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 動作 006：比對密碼
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 動作 007：簽發 JWT
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });

    // 動作 008：更新最後登入時間（Prisma 欄位是 lastLoginAt）
    await (this.prisma as any).nx00User.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 動作 009：回傳 token + 基本 user 資訊
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.displayName ?? null, // 回傳給前端仍可用 display_name 命名
      },
    };
  }

  /**
   * @CODE nxapi_nx00_auth_me_003
   * 說明：
   * - JWT Guard 解析 sub 後，帶入 userId
   * - 查 nx00_user 回傳乾淨 DTO（不包含 passwordHash）
   */
  async me(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Token user not found');
    }

    const user = await (this.prisma as any).nx00User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        isActive: true,
        statusCode: true,
        remark: true,
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
      email: user.email,
      phone: user.phone,
      is_active: user.isActive,
      uu_sta: user.statusCode,
      uu_rmk: user.remark,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt,
    };
  }
}
