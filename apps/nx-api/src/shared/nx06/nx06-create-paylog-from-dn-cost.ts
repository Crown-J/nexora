// apps/nx-api/src/shared/nx06/nx06-create-paylog-from-dn-cost.ts
// 從 DN 件項 internalCost 建立 NX05 Paylog EX 費用支出（冪等、pure export、本軌不 wire 入 production）
//
// 對齊：
//   - TASK-NX06-IMPL-01 Phase 4 L4 跨模組 wire（NX06 內部成本 → NX05 費用支出 PY-EX 範式預留）
//   - overview §3.1 #10 配送成本追蹤（Crown Q8/Q9=a 拍板：汽配業界客戶不另收運費、成本內部記錄）
//   - 範式：自家油錢估算 or Lalamove API 回傳實際費用 → 月底會計入帳費用
//
// 業務語意（pure export，不 wire）：
//   - DN COMPLETED 後、若 items 有 internalCost 加總 > 0 → 建一筆 NX05 Paylog payType='EX' DRAFT
//   - 會計人員後續手動 POSTED（既有 NX05 paylog 流程）
//   - 冪等：透過 remark `DN:<dnId>` 標記去重
//
// 邊界：
//   - 本軌不 wire 入 dn-logistics.patchDn（避免 DN 完成流程外部依賴）
//   - 後續軌：dn-logistics.patchDn 終態完成 hook or 排程批次 → 月結時跑
//   - 純 helper：DRAFT only、不 POST、不扣現金（會計手動審）
//   - accountCodeId 留 null（呼叫端要過 POSTED 時補、避免本 helper 對 NX05 科目硬編碼）

import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo, orgCodeFromDocNo } from '../nx05/nx05-doc-no';

const DN_PAYLOG_REMARK_PREFIX = 'DN:';

export async function createPaylogExFromDnCost(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; dnId: string; userId: string },
): Promise<string | null> {
  // 1. load DN + items（含 internalCost）
  const dn = await tx.nx06Dn.findFirst({
    where: { id: p.dnId, tenantId: p.tenantId },
    select: {
      id: true,
      docNo: true,
      dnDate: true,
      status: true,
      rev_Nx06DnItem_dnId: {
        select: { internalCost: true },
      },
    },
  });
  if (!dn) return null;
  if (dn.status !== 'DELIVERED' && dn.status !== 'PICKED_UP') return null;

  // 冪等：同 dnId 已寫過 paylog → return existing id
  const dupRemark = `${DN_PAYLOG_REMARK_PREFIX}${dn.docNo}`;
  const dup = await tx.nx05Paylog.findFirst({
    where: { tenantId: p.tenantId, payType: 'EX', remark: { startsWith: dupRemark } },
    select: { id: true },
  });
  if (dup) return dup.id;

  // 2. 加總 internalCost
  let total = new PrismaNs.Decimal(0);
  for (const it of dn.rev_Nx06DnItem_dnId) {
    if (it.internalCost) total = total.add(it.internalCost);
  }
  if (total.lte(0)) return null;

  // 3. 取機構碼（DN docNo 第三段）+ 配 PY 單號
  const orgCode = orgCodeFromDocNo(dn.docNo);
  const docNo = await allocNx05DocNo(tx, p.tenantId, 'EX', orgCode);

  // 4. 寫 Paylog payType='EX' DRAFT
  const log = await tx.nx05Paylog.create({
    data: {
      tenantId: p.tenantId,
      docNo,
      payType: 'EX',
      payDate: new Date(dn.dnDate),
      partnerId: null,
      amount: total,
      currencyId: 'TWD',
      payMethod: 'CA',
      accountCodeId: null,
      status: 'DRAFT',
      remark: `${DN_PAYLOG_REMARK_PREFIX}${dn.docNo}|配送成本內部記錄`,
      createdBy: p.userId,
      updatedBy: p.userId,
    },
    select: { id: true },
  });
  return log.id;
}
