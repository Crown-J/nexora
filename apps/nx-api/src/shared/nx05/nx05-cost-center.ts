// apps/nx-api/src/shared/nx05/nx05-cost-center.ts
// ⭐ 總帳脊椎 C1：成本中心解析（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §12「待拍板」第 1 題
//       → 2026-08-01 執行長拍板：**成本中心用「店」**。
//
// 🔴 為什麼需要這一支：
//   所有存貨相關的分錄行（進貨／調撥／盤點盈虧／報廢／保固出庫）在過帳規則上都要求填成本中心，
//   但這些單據上**沒有業務員、只有倉庫**。B6 銷貨之所以繞得過去，是因為銷貨單有業務員。
//   會計政策第 11 項寫的是「不分攤、看店的貢獻」——所以正解本來就是據點，不是人資部門。
//
// 解析順序（倉庫優先、人其次）：
//   ① 倉庫 → 據點 → 據點的對應成本中心      ← 正解
//   ② 使用者（業務員／建單人）的人資部門      ← 相容既有行為的退路
//   ③ null → 呼叫端自行決定要 skip 還是報錯
//
// ⚠ 為什麼保留 ②：據點的成本中心是**可空欄位**，沒設定的租戶不該因此被擋住既有流程。
//    ⛔ 但退路不是沒事——退路被用到代表該據點還沒設成本中心，貢獻式損益會按人切而不是按店切。
//    所以回傳值帶 `source`，呼叫端要能把「走了退路」記錄下來、由對帳表看得見。

import type { Prisma } from 'db-core';

/** 成本中心從哪裡解析出來的。⚠ `USER` 代表據點還沒設成本中心、走了退路。 */
export type CostCenterSource = 'SITE' | 'USER' | 'NONE';

export interface CostCenterResult {
  departmentId: string | null;
  source: CostCenterSource;
}

const NONE: CostCenterResult = { departmentId: null, source: 'NONE' };

/** 倉庫 → 據點 → 對應成本中心。查不到或該部門已停用則回 null。 */
export async function resolveCostCenterByWarehouse(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseId: string | null | undefined,
): Promise<string | null> {
  if (!warehouseId) return null;
  const wh = await tx.nx01Warehouse.findFirst({
    where: { id: warehouseId, tenantId },
    select: { site: { select: { costCenterDeptId: true, isActive: true } } },
  });
  const deptId = wh?.site?.costCenterDeptId ?? null;
  if (!deptId) return null;
  // ⚠ 據點本身停用不影響歷史單據過帳（帳要能補過去的單），所以只驗部門
  const dept = await tx.nx01Department.findFirst({
    where: { id: deptId, tenantId, isActive: true },
    select: { id: true },
  });
  return dept?.id ?? null;
}

/** 使用者的人資部門（退路）。 */
export async function resolveCostCenterByUser(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  const u = await tx.nx01User.findFirst({
    where: { id: userId, tenantId },
    select: { departmentId: true },
  });
  const deptId = u?.departmentId ?? null;
  if (!deptId) return null;
  const dept = await tx.nx01Department.findFirst({
    where: { id: deptId, tenantId, isActive: true },
    select: { id: true },
  });
  return dept?.id ?? null;
}

/**
 * ⭐ 統一入口：先走店、再走人。
 * @param warehouseId 單據所屬倉庫（庫存類單據一定有）
 * @param fallbackUserId 業務員或建單人；沒有倉庫的劇本才會用到
 */
export async function resolveCostCenter(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; warehouseId?: string | null; fallbackUserId?: string | null },
): Promise<CostCenterResult> {
  const bySite = await resolveCostCenterByWarehouse(tx, p.tenantId, p.warehouseId);
  if (bySite) return { departmentId: bySite, source: 'SITE' };

  const byUser = await resolveCostCenterByUser(tx, p.tenantId, p.fallbackUserId);
  if (byUser) return { departmentId: byUser, source: 'USER' };

  return NONE;
}
