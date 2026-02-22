/**
 * File: apps/nx-api/src/nx00/rbac/rbac.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-API-SVC-001：RBAC 管理 Service（roles / members / search）
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RoleListItemDto, RoleMembersDto, UserLiteDto } from '../dto/rbac.dto';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @FUNCTION_CODE NX00-RBAC-API-SVC-001-F01
   * 說明：
   * - 列出 Roles（給後台 RoleListPanel）
   */
  async listRoles(): Promise<RoleListItemDto[]> {
    const rows = await this.prisma.nx00Role.findMany({
      orderBy: [{ code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
      },
    });

    return rows;
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-SVC-001-F02
   * 說明：
   * - 取得指定 role 的 members（給 chips）
   */
  async getRoleMembers(roleId: string): Promise<RoleMembersDto> {
    const role = await this.prisma.nx00Role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException(`Role not found: ${roleId}`);

    const links = await this.prisma.nx00UserRole.findMany({
      where: { roleId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const members: UserLiteDto[] = links.map((x) => ({
      id: x.user.id,
      username: x.user.username,
      displayName: x.user.displayName,
    }));

    return { roleId, members };
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-SVC-001-F03
   * 說明：
   * - 新增 role member（避免重複：由 Prisma unique(userId, roleId) 保證）
   * - createdBy：若有 currentUserId 就寫入，沒有就 null
   */
  async addRoleMember(roleId: string, userId: string, currentUserId?: string | null): Promise<void> {
    // 檢查 role / user 是否存在（回饋更清楚）
    const [role, user] = await Promise.all([
      this.prisma.nx00Role.findUnique({ where: { id: roleId }, select: { id: true } }),
      this.prisma.nx00User.findUnique({ where: { id: userId }, select: { id: true } }),
    ]);

    if (!role) throw new NotFoundException(`Role not found: ${roleId}`);
    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    try {
      await this.prisma.nx00UserRole.create({
        data: {
          roleId,
          userId,
          createdBy: currentUserId ?? null,
        },
      });
    } catch (e: any) {
      // Prisma unique violation (P2002)：代表已存在，視為成功即可（idempotent）
      if (e?.code === 'P2002') return;
      throw e;
    }
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-SVC-001-F04
   * 說明：
   * - 移除 role member（deleteMany：即使不存在也不報錯）
   */
  async removeRoleMember(roleId: string, userId: string): Promise<void> {
    await this.prisma.nx00UserRole.deleteMany({
      where: { roleId, userId },
    });
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-API-SVC-001-F05
   * 說明：
   * - 搜尋 Users（給右側 candidates）
   * - 先用 username/displayName contains（case-insensitive）
   * - take 預設 10
   */
  async searchUsers(q: string, take = 10): Promise<UserLiteDto[]> {
    const keyword = q.trim();
    if (!keyword) return [];

    const rows = await this.prisma.nx00User.findMany({
      where: {
        OR: [
          { username: { contains: keyword, mode: 'insensitive' } },
          { displayName: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ username: 'asc' }],
      take,
      select: { id: true, username: true, displayName: true },
    });

    return rows;
  }
}