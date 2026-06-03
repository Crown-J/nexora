// apps/nx-api/src/nx01/user-pref/user-pref.service.ts
// 使用者偏好設定 service — list / get / upsert / delete

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class UserPrefService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列出當前 user 的所有偏好設定 */
  async list(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx01UserPref.findMany({
      where: { tenantId, userId: user.sub },
      select: { prefKey: true, prefValue: true, updatedAt: true },
      orderBy: { prefKey: 'asc' },
    });
    return rows;
  }

  /** 取某 key 的設定（不存在回 null）*/
  async get(user: RequestUser, prefKey: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01UserPref.findFirst({
      where: { tenantId, userId: user.sub, prefKey },
      select: { prefKey: true, prefValue: true, updatedAt: true },
    });
    return row;
  }

  /** upsert 某 key 的設定（同 user × key unique）*/
  async upsert(user: RequestUser, prefKey: string, prefValue: Record<string, unknown>) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01UserPref.findFirst({
      where: { userId: user.sub, prefKey },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.nx01UserPref.update({
        where: { id: existing.id },
        data: { prefValue, updatedBy: user.sub },
      });
    } else {
      await this.prisma.nx01UserPref.create({
        data: {
          tenantId,
          userId: user.sub,
          prefKey,
          prefValue,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });
    }
    return { prefKey, prefValue };
  }

  /** 刪除某 key 的設定（idempotent）*/
  async remove(user: RequestUser, prefKey: string) {
    await this.prisma.nx01UserPref.deleteMany({
      where: { userId: user.sub, prefKey },
    });
    return { ok: true };
  }
}
