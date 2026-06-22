// apps/nx-api/src/nx01/user-team/user-team.service.ts
// 05 批 T3 2026-06-07：UserTeam 衛星 service（範式對齊 user-role）
//
// 業務語意：
//   - 員工 m-n 隸屬組、每員工至多 1 筆 isPrimary=true（主組）
//   - 主組決定 user.departmentId（自動帶、寫 user.department_id）
//   - 撤銷主組時、自動把該員工剩餘 active team 中最新的設為主組（保 departmentId）
//   - 無 active team 時、user.departmentId 設 null（fallback 由基本資料手動編）
//
// 對 NX01-08 公告系統的影響：
//   - audience-query.service findLeaderUserIds 仍讀 isLeader（不影響）
//   - findUserIdsByDepartment 透過 team→department 找、新範式下 user.departmentId 自動帶、不影響
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  AssignUserTeamDto,
  ListUserTeamQueryDto,
  RevokeUserTeamDto,
  SetActiveUserTeamDto,
  SetLeaderUserTeamDto,
  SetPrimaryUserTeamDto,
} from './dto/user-team.dto';

const SEL = {
  id: true,
  tenantId: true,
  userId: true,
  teamId: true,
  isPrimary: true,
  isLeader: true,
  isActive: true,
  assignedAt: true,
  assignedBy: true,
  revokedAt: true,
  user: { select: { userName: true, userAccount: true } },
  team: {
    select: {
      code: true,
      name: true,
      departmentId: true,
      department: { select: { code: true, name: true } },
    },
  },
} as const;

type Row = Prisma.Nx01UserTeamGetPayload<{ select: typeof SEL }>;

export type UserTeamDtoOut = {
  id: string;
  userId: string;
  teamId: string;
  isPrimary: boolean;
  isLeader: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  userAccount: string | null;
  teamCode: string | null;
  teamName: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
};

@Injectable()
export class UserTeamService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: Row): UserTeamDtoOut {
    return {
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      isPrimary: row.isPrimary,
      isLeader: row.isLeader,
      isActive: row.isActive,
      assignedAt: row.assignedAt.toISOString(),
      assignedBy: row.assignedBy,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      userDisplayName: row.user?.userName ?? row.user?.userAccount ?? null,
      userAccount: row.user?.userAccount ?? null,
      teamCode: row.team?.code ?? null,
      teamName: row.team?.name ?? null,
      departmentId: row.team?.departmentId ?? null,
      departmentCode: row.team?.department?.code ?? null,
      departmentName: row.team?.department?.name ?? null,
    };
  }

  /**
   * 同步員工的 hrDepartmentId（自動帶）：
   *   - 找該員工當前 isPrimary=true + isActive=true 的 userTeam → team.departmentId 寫入 user.department_id
   *   - 沒有主組 → 不動 user.department_id（保留現值作 fallback、業務員可手動編）
   *
   * 注意：caller 應在 tx 內呼叫此 helper、確保 hrDepartmentId 與 userTeam 狀態一致。
   */
  private async syncUserHrDepartmentId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const primary = await tx.nx01UserTeam.findFirst({
      where: { tenantId, userId, isPrimary: true, isActive: true },
      select: { team: { select: { departmentId: true } } },
    });
    if (primary?.team?.departmentId) {
      await tx.nx01User.update({
        where: { id: userId },
        data: { departmentId: primary.team.departmentId },
      });
    }
    // 無主組時不動 user.departmentId、保留前一個值（或業務員手動設）
  }

  async list(user: RequestUser, q: ListUserTeamQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.Nx01UserTeamWhereInput = { tenantId };
    if (q.userId) where.userId = q.userId;
    if (q.teamId) where.teamId = q.teamId;
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const [total, rows] = await Promise.all([
      this.prisma.nx01UserTeam.count({ where }),
      this.prisma.nx01UserTeam.findMany({
        where,
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01UserTeam.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('UserTeam not found');
    return this.mapRow(row);
  }

  async assign(user: RequestUser, dto: AssignUserTeamDto) {
    const tenantId = requireTenantId(user);
    // 同員工同組唯一（schema unique 守、含已撤銷）：若已存在 → 若 active 拒、若 revoked 改 reassign
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01UserTeam.findFirst({
        where: { tenantId, userId: dto.userId, teamId: dto.teamId },
        select: { id: true, isActive: true },
      });

      // 若指定 isPrimary、先把該員工其他 isPrimary 改 false
      if (dto.isPrimary) {
        await tx.nx01UserTeam.updateMany({
          where: { tenantId, userId: dto.userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      let row: Row;
      if (existing) {
        if (existing.isActive) {
          throw new ConflictException('User already has this team');
        }
        // 重新啟用既有撤銷紀錄
        row = await tx.nx01UserTeam.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            revokedAt: null,
            assignedAt: new Date(),
            assignedBy: user.sub,
            isPrimary: dto.isPrimary ?? false,
            isLeader: dto.isLeader ?? false,
          },
          select: SEL,
        });
      } else {
        row = await tx.nx01UserTeam.create({
          data: {
            tenantId,
            userId: dto.userId,
            teamId: dto.teamId,
            isPrimary: dto.isPrimary ?? false,
            isLeader: dto.isLeader ?? false,
            isActive: true,
            assignedBy: user.sub,
            createdBy: user.sub,
          },
          select: SEL,
        });
      }

      // 新員工首次指派、自動設主組（方便）：若該員工目前無任何 active primary、自動把這筆設 primary
      if (!dto.isPrimary) {
        const hasPrimary = await tx.nx01UserTeam.findFirst({
          where: { tenantId, userId: dto.userId, isPrimary: true, isActive: true },
          select: { id: true },
        });
        if (!hasPrimary) {
          row = await tx.nx01UserTeam.update({
            where: { id: row.id },
            data: { isPrimary: true },
            select: SEL,
          });
        }
      }

      await this.syncUserHrDepartmentId(tx, tenantId, dto.userId);
      return this.mapRow(row);
    });
  }

  async revoke(user: RequestUser, id: string, _dto: RevokeUserTeamDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01UserTeam.findFirst({
        where: { id, tenantId },
        select: { id: true, userId: true, isPrimary: true, isActive: true },
      });
      if (!existing) throw new NotFoundException('UserTeam not found');

      const updated = await tx.nx01UserTeam.update({
        where: { id },
        data: { isActive: false, isPrimary: false, revokedAt: new Date() },
        select: SEL,
      });

      // 若撤銷的是主組、自動把該員工剩餘 active team 中最新的設為主組（保 hrDepartmentId）
      if (existing.isPrimary) {
        const next = await tx.nx01UserTeam.findFirst({
          where: { tenantId, userId: existing.userId, isActive: true, id: { not: id } },
          orderBy: { assignedAt: 'desc' },
          select: { id: true },
        });
        if (next) {
          await tx.nx01UserTeam.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }

      await this.syncUserHrDepartmentId(tx, tenantId, existing.userId);
      return this.mapRow(updated);
    });
  }

  async setPrimary(user: RequestUser, id: string, dto: SetPrimaryUserTeamDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.nx01UserTeam.findFirst({
        where: { id, tenantId },
        select: { id: true, userId: true, isActive: true },
      });
      if (!target) throw new NotFoundException('UserTeam not found');
      if (!target.isActive && dto.isPrimary) {
        throw new ConflictException('Cannot set inactive team as primary');
      }

      if (dto.isPrimary) {
        // 把該員工其他 isPrimary=true 改 false
        await tx.nx01UserTeam.updateMany({
          where: { tenantId, userId: target.userId, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      const updated = await tx.nx01UserTeam.update({
        where: { id },
        data: { isPrimary: dto.isPrimary },
        select: SEL,
      });
      await this.syncUserHrDepartmentId(tx, tenantId, target.userId);
      return this.mapRow(updated);
    });
  }

  async setLeader(user: RequestUser, id: string, dto: SetLeaderUserTeamDto) {
    const tenantId = requireTenantId(user);
    const target = await this.prisma.nx01UserTeam.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('UserTeam not found');
    const updated = await this.prisma.nx01UserTeam.update({
      where: { id },
      data: { isLeader: dto.isLeader },
      select: SEL,
    });
    return this.mapRow(updated);
  }

  async setActive(user: RequestUser, id: string, dto: SetActiveUserTeamDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.nx01UserTeam.findFirst({
        where: { id, tenantId },
        select: { id: true, userId: true, isPrimary: true },
      });
      if (!target) throw new NotFoundException('UserTeam not found');
      const updated = await tx.nx01UserTeam.update({
        where: { id },
        data: {
          isActive: dto.isActive,
          revokedAt: dto.isActive ? null : new Date(),
          // 停用時連帶解除 isPrimary（不能有 inactive primary）
          ...(dto.isActive ? {} : { isPrimary: false }),
        },
        select: SEL,
      });
      await this.syncUserHrDepartmentId(tx, tenantId, target.userId);
      return this.mapRow(updated);
    });
  }
}
