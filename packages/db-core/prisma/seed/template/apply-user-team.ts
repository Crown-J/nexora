// packages/db-core/prisma/seed/template/apply-user-team.ts
// @FUNCTION_CODE SYS-TMPL-SVC-014-F01
// 範本：user 與 team 關聯 + leader 指派（PLUS+）。LITE skip。
//
// 業務真相（Crown 拍 Q2 + Q3）：
//   - 依 user.role.code 自動 mapping 到對應 department 的 default team（apply-team 建的）
//   - 每個 department 的「第一個 user」設 isLeader = true
//   - SYSADMIN / OWNER 不 mapping（管理層、不屬部門）
//   - 1 user → 1 team（schema 支援 N:M、本 seed 給單 mapping 最小骨架）
//
// 對應 NX01-08 §3.2 audience_logic：
//   - leaders_all：findUserIdsByLeader（nx01_user_team.is_leader = true）
//   - by_team_id：findUserIdsByTeam（依 team_id 篩）
//
// role → department.code 對應（容忍 main 命名 vs 軌 4 命名差異）：
//   PURCHASING → 'PRODUCT' (軌 4 後) 或 'PURCHASE' (main、fallback)
//   SALES      → 'SALES'
//   WAREHOUSE  → 'WAREHOUSE'
//   FINANCE    → 'FINANCE'
//   HR         → 'HR' (PRO only)
//   LOGISTICS  → 不 mapping（A042 拍 role removed、department 保留但無 role 對應）
//   SYSADMIN / OWNER → 不 mapping（管理層）
//
// leader 指派業務真相（Crown 拍 Q3）：
//   每部門 schema 支援多 leader、軌 2 seed 給「每部門剛好 1 leader」（第一個 mapping 進來的 user）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

/**
 * role → department.code 對應表
 * Array 順序 = 優先嘗試順序（軌 4 後 PRODUCT 為先、main fallback PURCHASE）
 */
const ROLE_TO_DEPT_CODES: Record<string, readonly string[]> = {
  PURCHASING: ['PRODUCT', 'PURCHASE'],
  SALES: ['SALES'],
  WAREHOUSE: ['WAREHOUSE'],
  FINANCE: ['FINANCE'],
  HR: ['HR'],
};

export async function applyUserTeam(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  if (tier === 'LITE') {
    console.log('⏭ [TEMPLATE] applyUserTeam: skipped (LITE)');
    return;
  }

  // 1. 載入該租戶所有 active user + 其 primary role
  const userRoles = await prisma.nx01UserRole.findMany({
    where: { tenantId, isActive: true, isPrimary: true },
    include: {
      role: { select: { code: true } },
      user: { select: { id: true, isActive: true, userAccount: true } },
    },
  });
  const activeUserRoles = userRoles.filter((ur) => ur.user.isActive);

  // 2. 載入該租戶所有 team（依 department 對應）
  const teams = await prisma.nx01Team.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, departmentId: true, code: true },
  });
  // department.code → team mapping
  const departments = await prisma.nx01Department.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, code: true },
  });
  const deptCodeToId = new Map(departments.map((d) => [d.code, d.id]));
  const teamByDeptId = new Map(teams.map((t) => [t.departmentId, t]));

  // 3. 對每個 user 建 user_team（依 role mapping）
  // 紀錄各 department 的「第一個 user」、其 user_team.isLeader = true
  const deptFirstUser = new Map<string, boolean>(); // deptId → 已指派 leader 嗎

  let created = 0;
  let updated = 0;
  let skippedNoRole = 0;
  let skippedNoTeam = 0;

  for (const ur of activeUserRoles) {
    const roleCode = ur.role.code;
    const deptCodes = ROLE_TO_DEPT_CODES[roleCode];

    if (!deptCodes) {
      // SYSADMIN / OWNER / LOGISTICS / 其他 role 不 mapping
      skippedNoRole += 1;
      continue;
    }

    // 找對應的 department（依優先順序）
    let targetDeptId: string | undefined;
    for (const code of deptCodes) {
      const id = deptCodeToId.get(code);
      if (id) {
        targetDeptId = id;
        break;
      }
    }

    if (!targetDeptId) {
      console.warn(
        `⚠️ [TEMPLATE] applyUserTeam: user ${ur.user.userAccount} role ${roleCode} ` +
          `no matching department (tried: ${deptCodes.join('/')})`,
      );
      skippedNoTeam += 1;
      continue;
    }

    const team = teamByDeptId.get(targetDeptId);
    if (!team) {
      console.warn(
        `⚠️ [TEMPLATE] applyUserTeam: dept ${targetDeptId} no default team`,
      );
      skippedNoTeam += 1;
      continue;
    }

    // 判定是否為該 department 第一個 user → 設 isLeader = true
    const isLeader = !deptFirstUser.has(targetDeptId);
    if (isLeader) {
      deptFirstUser.set(targetDeptId, true);
    }

    const existing = await prisma.nx01UserTeam.findFirst({
      where: { tenantId, userId: ur.user.id, teamId: team.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.nx01UserTeam.update({
        where: { id: existing.id },
        data: { isLeader },
      });
      updated += 1;
    } else {
      await prisma.nx01UserTeam.create({
        data: {
          tenantId,
          userId: ur.user.id,
          teamId: team.id,
          isLeader,
          createdBy: actorUserId,
        },
      });
      created += 1;
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_user_team_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_user_team), 0), 1), true)`,
  );

  const leaderCount = deptFirstUser.size;
  console.log(
    `✅ [TEMPLATE] applyUserTeam: ${created + updated} 筆 (tenant=${tenantId} tier=${tier}、` +
      `created=${created}/updated=${updated}/leader=${leaderCount}/skipped=${skippedNoRole + skippedNoTeam})`,
  );
}
