// apps/nx-api/src/shared/nx03/nx03-issue-report-close.ts
// W5 異常鏈 Step 3 2026-07-11：處置單完成 / 過帳 → 回寫來源異常回報單（Nx03IssueReport）自動結案。
//
// 共用純函式（非 DI service）：nx02（退供應商 / 保固）與 nx03（報廢 / 重組分解）都要呼叫、
// 走純函式避免 Nx02Module ↔ Nx03Module circular import（對齊 nx05-create-ap-from-rr 範式）。
//
// 容錯原則：IR 不存在或不在 PROCESSING（已手動結案 / 作廢）→ 靜默跳過、不阻擋處置單自身流程。

import type { Prisma } from 'db-core';

/** Prisma tx 或 client 皆可（warranty 完成路徑不在交易內、傳 PrismaService）。 */
type Db = Prisma.TransactionClient;

export async function closeIssueReportFromDisposition(
  db: Db,
  args: {
    tenantId: string;
    issueReportId: string;
    /** 處置單單號（寫進 IR 結案備註、可讀追溯） */
    dispositionDocNo: string;
    userId: string;
  },
): Promise<void> {
  const ir = await db.nx03IssueReport.findFirst({
    where: { id: args.issueReportId, tenantId: args.tenantId },
    select: { id: true, status: true, description: true },
  });
  if (!ir || ir.status !== 'PROCESSING') return;
  const note = `[自動結案] 處置單 ${args.dispositionDocNo} 完成`;
  await db.nx03IssueReport.update({
    where: { id: ir.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: args.userId,
      description: ir.description ? `${ir.description}\n\n${note}` : note,
      updatedBy: args.userId,
    },
  });
}

/**
 * 來源異常單是否「帳已調」（off-book）：
 * - 盤點來源（NX03/STOCKTAKE）：盤點過帳已就地調帳
 * - 銷退壞品來源（NX04/SR）：銷退過帳壞品不入庫
 * 這兩種來源的報廢單過帳「不可」再扣庫存（防重複扣、W5 Step 2 已知設計點）。
 * 進貨驗收來源（NX02/RR、瑕疵品照常入庫）與手動建 IR → false、照常扣帳。
 */
export async function isOffBookIssueReport(
  db: Db,
  tenantId: string,
  issueReportId: string,
): Promise<boolean> {
  const ir = await db.nx03IssueReport.findFirst({
    where: { id: issueReportId, tenantId },
    select: { sourceModule: true, sourceDocType: true },
  });
  if (!ir) return false;
  return (
    (ir.sourceModule === 'NX03' && ir.sourceDocType === 'STOCKTAKE') ||
    (ir.sourceModule === 'NX04' && ir.sourceDocType === 'SR')
  );
}
