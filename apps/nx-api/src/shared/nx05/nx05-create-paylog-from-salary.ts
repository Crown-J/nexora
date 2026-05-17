// apps/nx-api/src/shared/nx05/nx05-create-paylog-from-salary.ts
// 從 NX07 SalaryRecord CONFIRMED 建立 NX05 Paylog payType='CP' 付款流水（冪等）
//
// 對齊：
//   - TASK-NX07-IMPL-01 Phase 4（業務閉環完整化最後一塊 ⭐⭐⭐）
//   - overview v0.1.0 §6（Crown Q3=a 拍板、業務閉環完整化）
//   - 範式：仿 NX05 既有 7 helper（nx05-create-ap-from-po / nx05-create-ar-from-so / nx05-create-allowance-from-pr 等）
//   - accountCodeId 對應「薪資支出」科目（seed code='6111'、非 Crown spec 的 6130）
//
// 業務語意：
//   - SalaryRecord status CONFIRMED → 自動建 Nx05Paylog DRAFT
//   - payType='CP'（廠商付款；員工亦走 CP 路徑、業務語意對齊「對外付款」）
//   - 後續由會計手動 POSTED（仿既有 CR/CP 流程）
//
// 冪等：
//   - remark prefix `SAL:<docNo>` 標記
//   - 同 salaryRecordId 重複呼叫 return existing paylog id

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo } from './nx05-doc-no';

const SAL_PAYLOG_REMARK_PREFIX = 'SAL:';
const SALARY_ACCOUNT_CODE = '6111'; // 薪資支出（seed 提供、非 Crown spec 的 6130）

export async function createPaylogFromConfirmedSalary(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; salaryRecordId: string; userId: string },
): Promise<string | null> {
  // 1. load salary
  const salary = await tx.nx07SalaryRecord.findFirst({
    where: { id: p.salaryRecordId, tenantId: p.tenantId },
    select: { id: true, userId: true, yearMonth: true, netSalary: true, status: true },
  });
  if (!salary) return null;
  if (salary.status !== 'CONFIRMED') return null;
  if (!salary.netSalary || new PrismaNs.Decimal(salary.netSalary).lte(0)) return null;

  // 2. 冪等：透過 remark prefix 去重
  const docNoLabel = `${salary.yearMonth}/${salary.userId}`;
  const dupRemark = `${SAL_PAYLOG_REMARK_PREFIX}${docNoLabel}`;
  const dup = await tx.nx05Paylog.findFirst({
    where: { tenantId: p.tenantId, payType: 'CP', remark: { startsWith: dupRemark } },
    select: { id: true },
  });
  if (dup) return dup.id;

  // 3. 查薪資支出科目（code='6111'）
  const account = await tx.nx05AccountCode.findFirst({
    where: { tenantId: p.tenantId, code: SALARY_ACCOUNT_CODE },
    select: { id: true },
  });

  // 4. 配 docNo（用 HQ0 機構碼 fallback、薪資非 SO/PO 衍生、無自然機構碼）
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'CP', 'HQ0');

  // 5. 寫 Paylog DRAFT
  const log = await tx.nx05Paylog.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      payType: 'CP',
      payDate: new Date(),
      partnerId: null, // 員工不屬 Partner、薪資 paylog 走 null partner
      amount: new PrismaNs.Decimal(salary.netSalary),
      currencyId: 'TWD',
      payMethod: 'TT', // 預設匯款（員工銀行轉帳）
      accountCodeId: account?.id ?? null,
      status: 'DRAFT',
      remark: `${SAL_PAYLOG_REMARK_PREFIX}${docNoLabel}|員工 ${salary.userId} 薪資 ${salary.yearMonth} 發放`,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });
  return log.id;
}
