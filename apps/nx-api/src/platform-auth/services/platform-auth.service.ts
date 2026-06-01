// apps/nx-api/src/platform-auth/services/platform-auth.service.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台超管認證 service
//
// 設計重點：
// - 跟租戶 AuthService 完全分離、不共用任何狀態
// - 用 platform_admin 表、不沾 nx01_user / nx99_tenant
// - JWT payload 帶 scope='platform'、跟租戶 token 區隔
// - 失敗訊息對齊既有 NexoraHttpException 範式（PL-xxx 錯誤碼系列）

import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import { NexoraHttpException } from '../../shared/errors/nexora-error';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) { }

  /**
   * 平台超管登入
   * - 用 account 找 platform_admin
   * - bcrypt 驗密碼
   * - 簽 JWT 帶 scope='platform'
   * - 更新 lastLoginAt
   */
  async login(account: string, password: string) {
    const accountTrim = String(account ?? '').trim();
    const pwd = String(password ?? '');
    if (!accountTrim || !pwd) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'PL-304',
        message: '請輸入平台帳號與密碼。',
      });
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { account: accountTrim },
      select: {
        id: true,
        account: true,
        passwordHash: true,
        displayName: true,
        isActive: true,
      },
    });

    // 情境 A：帳號不存在 → 模糊訊息（防 enumeration、平台後台尤其敏感）
    if (!admin) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: 'PL-001',
        message: '請確認帳號及密碼。',
      });
    }
    // 情境 B：帳號停用 → 仍給模糊訊息（平台帳號數量極少、不暴露任何狀態給外部）
    if (!admin.isActive) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: 'PL-001',
        message: '請確認帳號及密碼。',
      });
    }
    // 情境 C：密碼錯誤
    const ok = await bcrypt.compare(pwd, admin.passwordHash);
    if (!ok) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: 'PL-001',
        message: '請確認帳號及密碼。',
      });
    }

    const token = await this.jwt.signAsync({
      sub: admin.id,
      account: admin.account,
      scope: 'platform',
    });

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: admin.id,
        account: admin.account,
        display_name: admin.displayName,
      },
    };
  }

  /**
   * /platform/auth/me：回傳當前 platform admin 資料
   */
  async me(adminId: string) {
    if (!adminId) {
      throw new UnauthorizedException('Token user not found');
    }
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        account: true,
        displayName: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!admin) {
      throw new UnauthorizedException('Token user not found');
    }
    return {
      id: admin.id,
      account: admin.account,
      display_name: admin.displayName,
      email: admin.email,
      phone: admin.phone,
      is_active: admin.isActive,
      must_change_password: admin.mustChangePassword,
      last_login_at: admin.lastLoginAt,
      created_at: admin.createdAt,
      scope: 'platform' as const,
    };
  }

  /**
   * /platform/auth/change-password
   * - mustChangePassword=true 時可省 oldPassword（首次登入）
   * - 改完設 mustChangePassword=false
   */
  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'PL-303',
        message: '新密碼至少 6 字元。',
      });
    }
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { id: true, passwordHash: true, mustChangePassword: true },
    });
    if (!admin) {
      throw new UnauthorizedException('Platform admin not found');
    }
    if (!admin.mustChangePassword) {
      const ok = await bcrypt.compare(oldPassword, admin.passwordHash);
      if (!ok) {
        throw new NexoraHttpException({
          statusCode: HttpStatus.UNAUTHORIZED,
          errorCode: 'PL-201',
          message: '舊密碼錯誤。',
        });
      }
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.platformAdmin.update({
      where: { id: adminId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        updatedBy: adminId,
      },
    });
    return { ok: true };
  }
}
