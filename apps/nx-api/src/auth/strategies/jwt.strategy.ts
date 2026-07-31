/**
 * File: apps/nx-api/src/auth/strategies/jwt.strategy.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - JWT 驗證 + 注入 roles 到 req.user
 * - NX99-T3：validate 回傳 tenantId / tenantCode / planCode 供 API 識別租戶與方案
 * - **跨租戶平台**：僅當 nx01_user.tenantId 為 null 且具 SYSADMIN 職務時，租戶欄位為 null（A042 closure）
 * - **租戶內 OWNER**（如 DEMO 的 admin user）：仍帶該租戶 tenantId，列表／查詢僅限該公司
 *
 * Notes:
 * - validate 回傳物件會掛到 req.user
 * - 一定要保留 sub，避免 RolesGuard 判定為 Invalid token
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveEnabledModules } from '../../shared/module-access/resolve-enabled-modules';

export type JwtPayload = {
  sub: string;
  username: string;
  tenantId?: string | null;
  tenantCode?: string | null;
  planCode?: string | null;
  /** 平台/租戶層分離軌 Phase 2：'tenant' = 客戶員工 token / 'platform' = 平台超管 token（被本 strategy 拒絕）*/
  scope?: 'tenant' | 'platform';
  iat?: number;
  exp?: number;
};

export type RequestUser = {
  sub: string;
  username: string;
  roles: string[];
  tenantId: string | null;
  tenantCode: string | null;
  planCode: string | null;
  /** 職務↔權限拆分軌：使用者的權限等級代碼（'S'=全權限；null=未指派）。每 request 即時查 DB。*/
  permissionLevelCode: string | null;
  /**
   * 本租戶已啟用的 app 模組代碼（如 ['NX01','NX07']）。
   * 來源＝方案標配 ∪ 訂閱加購 → nx99_product_module_map.app_module_code。
   * 給 ModuleAccessGuard 用；跨租戶平台使用者為空陣列（不受模組限制，見該 guard）。
   */
  enabledModules: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
    });
  }

  /**
   * @CODE nxapi_auth_jwt_strategy_validate_003
   * @FUNCTION_CODE NX99-AUTH-STR-001-F01
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    // 平台/租戶層分離軌 Phase 2：scope='platform' token 不能進客戶 endpoint。
    // 既有未帶 scope 的舊 token 視為 tenant（向後相容過渡期）。
    if (payload.scope === 'platform') {
      throw new UnauthorizedException('Token scope mismatch (platform token cannot access tenant)');
    }

    const userRow = await this.prisma.nx01User.findUnique({
      where: { id: payload.sub },
      select: {
        tenantId: true,
        // 職務↔權限拆分軌：使用者的權限等級（每 request 即時帶 code）
        permissionLevel: { select: { code: true, isActive: true } },
      },
    });
    if (!userRow) {
      throw new UnauthorizedException('User not found');
    }
    const permissionLevelCode =
      userRow.permissionLevel && userRow.permissionLevel.isActive
        ? userRow.permissionLevel.code
        : null;

    const urWhere: { userId: string; isActive: boolean; tenantId?: string } = {
      userId: payload.sub,
      isActive: true,
    };
    if (userRow.tenantId) {
      urWhere.tenantId = userRow.tenantId;
    }

    const urRows = await this.prisma.nx01UserRole.findMany({
      where: urWhere,
      include: { role: true },
    });
    const roles = urRows.map((r) => r.role.code);

    /** 僅 SYSADMIN 為跨租戶平台、OWNER 屬單租戶不跨（A042 closure）*/
    const isCrossTenantPlatform =
      roles.some((c) => String(c).trim().toUpperCase() === 'SYSADMIN') && userRow.tenantId == null;

    let tenantId: string | null;
    let tenantCode: string | null;
    let planCode: string | null;
    let enabledModules: string[] = [];

    if (isCrossTenantPlatform) {
      tenantId = null;
      tenantCode = null;
      planCode = null;
    } else {
      tenantId = userRow.tenantId ?? payload.tenantId ?? null;
      tenantCode = payload.tenantCode ?? null;
      const payloadPlan = payload.planCode ?? null;

      if (tenantId) {
        if (!tenantCode) {
          const t = await this.prisma.nx99Tenant.findUnique({
            where: { id: tenantId },
            select: { code: true },
          });
          tenantCode = t?.code ?? null;
        }
        // 方案以 DB 有效訂閱為準；JWT 可能為舊簽發（plan 已變更）或與 nx99_plan.code 格式不一致。
        // 同一次解析順便取出已啟用模組 → ModuleAccessGuard 不必再打 DB。
        const resolved = await resolveEnabledModules(this.prisma, tenantId);
        planCode = resolved.planCode ?? payloadPlan;
        enabledModules = resolved.codes;
      } else {
        planCode = payloadPlan;
      }
    }

    return {
      sub: payload.sub,
      username: payload.username,
      roles,
      tenantId,
      tenantCode,
      planCode,
      permissionLevelCode,
      enabledModules,
    };
  }
}
