// apps/nx-api/src/shared/nx01/approve-permission.ts
// T1-fix-b 進貨對齊批次 2026-06-07：核准權限檢查 helper
//
// service 層用：在 update transition 內檢查 user 對 view 是否有 canApprove
// 而非 controller-level @Permission decorator（因為核准/退件/送審/寄出 都共用 PATCH /:id endpoint、
// 只有 isApproving/isRejecting 兩個 transition 需要核准權限）。
//
// 聯集語意（向後相容、不破壞既有 RolePermission 範式）：
//   1. user 任一角色對 viewCode 有 RoleView.canApprove=true → pass
//   2. user 任一角色有 RolePermission code='purchase.po.approve' 等 → pass
//   3. SYSADMIN / OWNER 永遠 pass（與 PermissionsGuard 一致）

import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

export async function requireApprovePermission(
  prisma: PrismaService,
  user: RequestUser,
  args: { viewCode: string; permissionCode: string },
): Promise<void> {
  if (!user?.sub) throw new ForbiddenException('Invalid token');

  // 查 user active 角色
  const userRoles = await prisma.nx01UserRole.findMany({
    where: { userId: user.sub, isActive: true },
    include: { role: { select: { id: true, code: true, isActive: true } } },
  });
  const activeRoles = userRoles.filter((ur) => ur.role.isActive);
  const activeRoleIds = activeRoles.map((ur) => ur.role.id);

  // SUPER 角色永遠 pass
  const roleCodes = activeRoles.map((ur) => String(ur.role.code).trim().toUpperCase());
  if (roleCodes.some((c) => c === 'SYSADMIN' || c === 'OWNER')) return;

  if (activeRoleIds.length === 0) {
    throw new ForbiddenException(`User has no active roles for ${args.permissionCode}`);
  }

  // 路徑 A：RoleView.canApprove（客戶從矩陣勾的）
  const approveGrant = await prisma.nx01RoleView.findFirst({
    where: {
      roleId: { in: activeRoleIds },
      isActive: true,
      canApprove: true,
      view: { code: args.viewCode },
    },
    select: { id: true },
  });
  if (approveGrant) return;

  // 路徑 B：RolePermission code（既有保固 / 盤點範式、向後相容）
  const codeGrant = await prisma.nx01RolePermission.findFirst({
    where: {
      roleId: { in: activeRoleIds },
      permission: { code: args.permissionCode, isActive: true },
    },
    select: { id: true },
  });
  if (codeGrant) return;

  throw new ForbiddenException(
    `Permission denied. Required: ${args.permissionCode} (or RoleView.canApprove on ${args.viewCode})`,
  );
}
