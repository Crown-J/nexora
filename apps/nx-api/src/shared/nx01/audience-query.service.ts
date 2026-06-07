// apps/nx-api/src/shared/nx01/audience-query.service.ts
// @FUNCTION_CODE NX01-AUDIENCE-SVC-001-F01
// A037 closure：「對象識別」query helper（軌 2 應用層補完、給軌 3 NX01-08 公告系統用）
//
// 對應 NX01-08 §3.2 audience_logic enum：
//   - tenant_all     → 全租戶 user（caller 自查、不在此 helper）
//   - system_all     → 全租戶 user + 跨租戶 SYSADMIN（同上）
//   - leaders_all    → findLeaderUserIds()：本 helper 提供
//   - by_team_id     → findUserIdsByTeam()：本 helper 提供
//   - by_department  → findUserIdsByDepartment()：本 helper 提供（依 NX01-08 §5.3 銷售/倉管/財務 category）
//
// 設計範式（諮詢階段 Hank 範式 B 變體）：
//   sourceOfTruth = `nx01_user_team.is_leader = true` 既有欄位（schema 不動、純應用層補完）
//
// 多租戶隔離：所有 query 都帶 tenantId WHERE、防越權跨租戶查。

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Nx01AudienceQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 找該 tenant 內所有部門組長的 user.id。
   * 對應 NX01-08 audience_logic = 'leaders_all'（「管理部門公告」對象）。
   *
   * 來源：nx01_user_team where isLeader = true + user.isActive = true。
   * 業務語意：每個 department 至少 1 leader、可多 leader。
   */
  async findLeaderUserIds(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.nx01UserTeam.findMany({
      where: {
        tenantId,
        isLeader: true,
        // 05 批 T3 2026-06-07：加 isActive=true 過濾、避免已撤銷的舊組長 leak（schema 加 isActive 後對齊）
        isActive: true,
        user: { isActive: true },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }

  /**
   * 找某 team 內所有 active user 的 user.id。
   * 對應 NX01-08 audience_logic = 'by_team_id'。
   *
   * 來源：nx01_user_team where teamId + user.isActive = true。
   * 業務語意：團隊公告（如「銷售部開會通知」）。
   */
  async findUserIdsByTeam(tenantId: string, teamId: string): Promise<string[]> {
    const rows = await this.prisma.nx01UserTeam.findMany({
      where: {
        tenantId,
        teamId,
        // 05 批 T3 2026-06-07：加 isActive=true 過濾、避免已撤銷的成員 leak
        isActive: true,
        user: { isActive: true },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }

  /**
   * 找某 department 內所有 active user 的 user.id（跨該部門所有 team）。
   * 對應 NX01-08 §3.2 「銷售 / 倉管 / 財務 / 產品 category」audience_logic。
   *
   * 來源：nx01_user_team → team → department.code = ?
   * 業務語意：部門公告（如「採購部門通知」、跨採購一組 / 採購二組）。
   */
  async findUserIdsByDepartment(
    tenantId: string,
    departmentCode: string,
  ): Promise<string[]> {
    const rows = await this.prisma.nx01UserTeam.findMany({
      where: {
        tenantId,
        // 05 批 T3 2026-06-07：加 isActive=true 過濾、避免已撤銷的成員 leak
        isActive: true,
        team: { department: { code: departmentCode } },
        user: { isActive: true },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }
}
