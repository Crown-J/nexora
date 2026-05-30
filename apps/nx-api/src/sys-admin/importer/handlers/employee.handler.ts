// apps/nx-api/src/sys-admin/importer/handlers/employee.handler.ts
// v1.2 對齊軌 C-FU：員工 importer
// 角色名稱（roleName）若該租戶有對應角色、自動指派；否則跳過角色綁定

import * as bcrypt from 'bcryptjs';

import type { HandlerContext, HandlerResult, ImportRow } from './base';
import { parseYesNo } from './base';

export async function importEmployees(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };
  const tempHash = await bcrypt.hash('Temp123!', 10);

  for (const { rowNo, data } of rows) {
    if (!data.userName || !data.email) {
      result.errors.push({ rowNo, reason: '姓名 / Email 必填' });
      continue;
    }
    const existing = await ctx.prisma.nx01User.findFirst({
      where: { userAccount: data.email },
      select: { id: true },
    });
    if (existing) {
      result.errors.push({ rowNo, reason: `Email ${data.email} 已存在、跳過` });
      continue;
    }
    const user = await ctx.prisma.nx01User.create({
      data: {
        tenantId: ctx.tenantId,
        userAccount: data.email,
        passwordHash: tempHash,
        userName: data.userName,
        email: data.email,
        phone: data.phone || null,
        isActive: parseYesNo(data.isActive, true),
        mustChangePassword: true,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    if (data.roleName) {
      const role = await ctx.prisma.nx01Role.findFirst({
        where: {
          tenantId: ctx.tenantId,
          name: data.roleName,
          isActive: true,
        },
        select: { id: true },
      });
      if (role) {
        await ctx.prisma.nx01UserRole.create({
          data: {
            tenantId: ctx.tenantId,
            userId: user.id,
            roleId: role.id,
            isPrimary: true,
            assignedBy: ctx.userId,
            isActive: true,
          },
        });
      }
      // 找不到角色 → 不報錯、用戶可後續到「設定→角色與權限」手動建後指派
    }
    result.imported++;
  }
  return result;
}
