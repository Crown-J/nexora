// apps/nx-api/src/sys-admin/importer/handlers/employee.handler.ts
// v1.2 對齊軌 C-FU：員工 importer
// 角色名稱（roleName）若該租戶有對應角色、自動指派；否則跳過角色綁定
//
// 員工編號制改造（2026-06-02）：
// - 員工帳號改自填欄位 employeeAccount（取代 email 當 userAccount）
// - email 改選填（聯絡用、寄信用、非登入）
// - 唯一性檢查改租戶內 userAccount
//
// 席次制改造（2026-06-03）：
// - isActive 一律 false（匯入未啟用、之後在精靈內挑啟用）
// - parseYesNo / 範本的「啟用」欄不再參考
// - 預設密碼抽到 shared/employee-defaults（importer + 主檔手動建/啟用共用、首登強制改）

import * as bcrypt from 'bcryptjs';

import { DEFAULT_EMPLOYEE_PASSWORD } from '../../../shared/nx01/employee-defaults';

import type { HandlerContext, HandlerResult, ImportRow } from './base';

export async function importEmployees(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };
  const tempHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);

  for (const { rowNo, data } of rows) {
    // 員編 = 登入帳號（自由輸入、租戶內唯一）；email 可選填
    const employeeAccount = String(data.employeeAccount ?? data.userAccount ?? '').trim();
    if (!data.userName || !employeeAccount) {
      result.errors.push({ rowNo, reason: '姓名 / 員工編號必填' });
      continue;
    }
    const existing = await ctx.prisma.nx01User.findFirst({
      where: { tenantId: ctx.tenantId, userAccount: { equals: employeeAccount, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      result.errors.push({ rowNo, reason: `員工編號 ${employeeAccount} 已存在、跳過` });
      continue;
    }
    const user = await ctx.prisma.nx01User.create({
      data: {
        tenantId: ctx.tenantId,
        userAccount: employeeAccount,
        passwordHash: tempHash,
        userName: data.userName,
        email: data.email ? String(data.email).trim() : null,
        phone: data.phone || null,
        // 席次制改造：匯入一律未啟用、之後在精靈挑啟用（受席次上限保護）
        isActive: false,
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
