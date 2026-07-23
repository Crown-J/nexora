// apps/nx-api/src/shared/nx03/nx03-putback-on-cancel.ts
// 撿貨中被取消 → 請放回（DOC-TIMING-KPI 同軌收尾、2026-07-23 執行長拍板）。
//
// 業務語意：撿貨清單某項所屬銷貨單被取消時——
//   · 撿貨清單本身已用 cancelledAt:null 過濾、取消單自動消失（自動移除已成立）。
//   · 缺口＝「已經撿下架、還沒包」的實體貨沒人通知放回。
// 本 helper 補這一段：SO 取消時，若有已撿(C)未包的撿貨明細，
//   ① 開一張高優先「請放回」待辦（共用待辦池 nx98_task_pool、任何倉管可領）；
//   ② 把這些貨所屬的隱形撿貨單作廢（剔出包貨台、保留歷史）。
// 註：撿貨清單只含銷貨單（getPickList 只查 Nx04SoItem）、調撥不在撿貨池，故僅適用 SO。

import type { Prisma } from 'db-core';

import { PkStatus } from './nx03-state-machine';

interface PutbackResult {
  created: boolean;
  putbackLines: number;
  voidedPkIds: string[];
}

/**
 * SO 取消時、對「已撿未包」的貨開請放回待辦 + 作廢隱形撿貨單。
 * 冪等：只挑未包(無 pl_item)的 C 撿貨明細；已包/已作廢的不動。無已撿貨則 no-op。
 */
export async function createPutbackOnSoCancel(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; soDocNo: string; userId: string },
): Promise<PutbackResult> {
  // 該 SO 已撿(C) 且未包(rev_Nx03PlItem_pkItemId 空) 的撿貨明細（帶項次 lineNo）
  const items = await tx.nx03PkItem.findMany({
    where: {
      status: 'C',
      refSoId: p.soId,
      pk: { tenantId: p.tenantId, status: { not: PkStatus.VOIDED } },
      rev_Nx03PlItem_pkItemId: { none: {} }, // 未被包貨引用＝還在架下、沒進箱
    },
    select: { id: true, pkId: true, refSoItemId: true, partNo: true, partName: true, qty: true, refSoItem: { select: { lineNo: true } } },
  });
  if (!items.length) return { created: false, putbackLines: 0, voidedPkIds: [] };

  // 依「銷貨單項次」彙總（一項次一張待辦：標題主打料號×數量、副標帶單號項次）
  const byLine = new Map<string, { partNo: string; partName: string; lineNo: number; qty: number }>();
  for (const it of items) {
    const key = it.refSoItemId ?? it.id;
    const cur = byLine.get(key) ?? { partNo: it.partNo, partName: it.partName, lineNo: it.refSoItem?.lineNo ?? 0, qty: 0 };
    cur.qty += Number(it.qty);
    byLine.set(key, cur);
  }
  const lines = [...byLine.values()];

  // ① 逐項次開請放回待辦（category=PUTBACK、priority=H、留池中任何倉管可領）
  //    標題（黑字主打）＝料號 ×數量　已取消；內文（淺色參考）＝單號 項次（執行長回饋：料號當主角）
  for (const l of lines) {
    await tx.nx98TaskPool.create({
      data: {
        tenantId: p.tenantId,
        title: `${l.partNo} ×${l.qty}　已取消`,
        description: `${p.soDocNo}　項次 ${l.lineNo}`,
        category: 'PUTBACK',
        priority: 'H',
        sourceModule: 'NX03',
        sourceDocType: 'SO',
        sourceDocId: p.soId,
        sourceDocNo: p.soDocNo,
        status: 'OPEN',
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  // ② 作廢這些貨所屬的隱形撿貨單（一 SO 一張隱形 PK；已確認無已包明細＝可安全作廢、剔出包貨台）
  const pkIds = [...new Set(items.map((i) => i.pkId))];
  const voidedPkIds: string[] = [];
  for (const pkId of pkIds) {
    const packed = await tx.nx03PlItem.count({ where: { pkItem: { pkId } } });
    if (packed > 0) continue; // 保險：有已包明細的不作廢（撿貨中取消不會發生）
    await tx.nx03Pk.update({
      where: { id: pkId },
      data: { status: PkStatus.VOIDED, updatedBy: p.userId },
    });
    voidedPkIds.push(pkId);
  }

  return { created: true, putbackLines: lines.length, voidedPkIds };
}
