// apps/nx-api/src/sys-admin/importer/__tests__/employee-template.spec.ts
// 員工 importer end-to-end 合理路徑驗證（mock prisma）：
//   下載新範本（EMPLOYEE_TEMPLATE） → Excel raw rows →
//   extractDataRows → importEmployees handler → DB.create 收到正確 data
//
// 2026-06-03 員工編號制範本對齊 bug 驗證：
//   1. 範本第 2 欄改成「員工編號（登入用）」field=employeeAccount → handler.data.employeeAccount 必須非空
//   2. Email 退為選填 → 沒填也能匯入成功
//   3. isActive 一律 false（席次制改造、不再讀範本）

import { describe, it, expect, vi } from 'vitest';

import { extractDataRows } from '../handlers/base';
import { importEmployees } from '../handlers/employee.handler';
import type { HandlerContext } from '../handlers/base';
import { EMPLOYEE_TEMPLATE } from '../import-templates';

function buildHandlerContext(createSpy: ReturnType<typeof vi.fn>): HandlerContext {
  return {
    tenantId: 'NX99TANT9900002',
    userId: 'NX01USER9900002',
    dataStartDate: null,
    prisma: {
      nx01User: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: createSpy,
      },
      nx01Role: { findFirst: vi.fn().mockResolvedValue(null) },
      nx01UserRole: { create: vi.fn() },
    } as never,
  };
}

describe('員工範本（員工編號制對齊）', () => {
  it('範本欄位順序對 handler 期望的 field 一致', () => {
    const fields = EMPLOYEE_TEMPLATE.columns.map((c) => c.field);
    expect(fields).toEqual(['userName', 'employeeAccount', 'email', 'phone', 'roleName']);
  });

  it('員編必填、Email 改選填', () => {
    const employeeAccountCol = EMPLOYEE_TEMPLATE.columns.find((c) => c.field === 'employeeAccount');
    const emailCol = EMPLOYEE_TEMPLATE.columns.find((c) => c.field === 'email');
    expect(employeeAccountCol?.required).toBe(true);
    expect(emailCol?.required).toBe(false);
  });

  it('已拿掉「啟用」欄', () => {
    const isActiveCol = EMPLOYEE_TEMPLATE.columns.find((c) => c.field === 'isActive');
    expect(isActiveCol).toBeUndefined();
  });
});

describe('員工 importer 端到端解析 + 寫入（mock prisma）', () => {
  /**
   * 模擬 Excel raw rows：
   * row 0 = header（中文）
   * row 1 = hint
   * row 2 = example
   * row 3+ = 實際資料（extractDataRows 跳前 3 列）
   */
  function buildRawRows(dataRows: string[][]): string[][] {
    const headers = EMPLOYEE_TEMPLATE.columns.map((c) => c.header);
    const hints = EMPLOYEE_TEMPLATE.columns.map((c) => c.hint ?? '');
    const examples = EMPLOYEE_TEMPLATE.columns.map((c) => c.example ?? '');
    return [headers, hints, examples, ...dataRows];
  }

  it('新範本一筆「Y0053 王小明」可成功匯入、寫入 isActive=false / mustChangePassword=true', async () => {
    const raw = buildRawRows([
      ['王小明', 'Y0053', '', '0912-345-678', ''],
    ]);
    const fieldsByCol = EMPLOYEE_TEMPLATE.columns.map((c) => c.field);
    const importRows = extractDataRows(raw, fieldsByCol);

    expect(importRows).toHaveLength(1);
    expect(importRows[0]!.rowNo).toBe(4);
    expect(importRows[0]!.data.userName).toBe('王小明');
    expect(importRows[0]!.data.employeeAccount).toBe('Y0053');
    expect(importRows[0]!.data.email).toBe('');
    expect(importRows[0]!.data.phone).toBe('0912-345-678');

    const createSpy = vi.fn().mockResolvedValue({ id: 'NX01USERnewuser' });
    const ctx = buildHandlerContext(createSpy);

    const result = await importEmployees(ctx, importRows);

    expect(result.imported).toBe(1);
    expect(result.errors).toEqual([]);
    expect(createSpy).toHaveBeenCalledOnce();
    const createArg = createSpy.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(createArg.data.userName).toBe('王小明');
    expect(createArg.data.userAccount).toBe('Y0053');
    expect(createArg.data.isActive).toBe(false);
    expect(createArg.data.mustChangePassword).toBe(true);
    expect(createArg.data.tenantId).toBe('NX99TANT9900002');
    expect(typeof createArg.data.passwordHash).toBe('string');
    expect((createArg.data.passwordHash as string).startsWith('$2')).toBe(true); // bcrypt 格式
  });

  it('email 沒填也成功（員編制：email 純聯絡用）', async () => {
    const raw = buildRawRows([
      ['李大華', 'wang', '', '', ''],
    ]);
    const fieldsByCol = EMPLOYEE_TEMPLATE.columns.map((c) => c.field);
    const importRows = extractDataRows(raw, fieldsByCol);
    const createSpy = vi.fn().mockResolvedValue({ id: 'NX01USERuser002' });
    const ctx = buildHandlerContext(createSpy);

    const result = await importEmployees(ctx, importRows);
    expect(result.imported).toBe(1);
    expect(result.errors).toEqual([]);
    const createArg = createSpy.mock.calls[0]![0] as { data: { email: unknown } };
    expect(createArg.data.email).toBeNull();
  });

  it('員編空 → 報「姓名 / 員工編號必填」、不寫入', async () => {
    const raw = buildRawRows([
      ['林某人', '', 'foo@bar.com', '', ''],
    ]);
    const fieldsByCol = EMPLOYEE_TEMPLATE.columns.map((c) => c.field);
    const importRows = extractDataRows(raw, fieldsByCol);
    const createSpy = vi.fn();
    const ctx = buildHandlerContext(createSpy);

    const result = await importEmployees(ctx, importRows);
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.reason).toContain('員工編號必填');
    expect(createSpy).not.toHaveBeenCalled();
  });
});
