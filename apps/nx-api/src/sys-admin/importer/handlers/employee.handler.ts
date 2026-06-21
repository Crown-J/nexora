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
//
// CYTIC 對齊規格 §128/§387 audit B6（2026-06-21）：
// - employeeAccount 改 optional：留空時從 nx01_seq_counter scope='EMPLOYEE' 自動產 Y+4 碼
// - 純數字員編格式化（Y001 → Y0001 / 156 → Y0156 / wang → wang 保留自由文字）
// - 新增 legacyCode 欄（舊系統員編對照）
// - 新增 jobTitle 欄（職務純文字、顯示用）

import * as bcrypt from 'bcryptjs';

import { DEFAULT_EMPLOYEE_PASSWORD } from '../../../shared/nx01/employee-defaults';

import type { HandlerContext, HandlerResult, ImportRow } from './base';

/// 員編格式化：純數字 → Y+4 碼補零（例：1 → Y0001、156 → Y0156）
/// Y+數字 → 取數字 padStart 4 碼（例：Y156 → Y0156）
/// 其他自由文字（wang）原樣返回
function formatEmployeeAccount(value: string): string {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return `Y${trimmed.padStart(4, '0')}`;
  }
  const yMatch = trimmed.match(/^Y(\d+)$/i);
  if (yMatch) {
    return `Y${yMatch[1].padStart(4, '0')}`;
  }
  return trimmed;
}

export async function importEmployees(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };
  const tempHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);

  for (const { rowNo, data } of rows) {
    if (!data.userName) {
      result.errors.push({ rowNo, reason: '姓名必填' });
      continue;
    }
    // 員編 = 登入帳號（自由輸入、租戶內唯一）；email 可選填
    // CYTIC 對齊規格 §387：員編留空時從 EMPLOYEE seq counter 自動產 Y+4 碼
    const rawAccount = String(data.employeeAccount ?? data.userAccount ?? '').trim();
    let employeeAccount: string;
    if (rawAccount) {
      employeeAccount = formatEmployeeAccount(rawAccount);
    } else {
      const counter = await ctx.prisma.nx01SeqCounter.upsert({
        where: { tenantId_scope: { tenantId: ctx.tenantId, scope: 'EMPLOYEE' } },
        create: { tenantId: ctx.tenantId, scope: 'EMPLOYEE', nextNo: 2 },
        update: { nextNo: { increment: 1 } },
      });
      const nextNo = counter.nextNo - 1;
      employeeAccount = `Y${String(nextNo).padStart(4, '0')}`;
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
        legacyCode: data.legacyCode ? String(data.legacyCode).trim() : null,
        jobTitle: data.jobTitle ? String(data.jobTitle).trim() : null,
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
