// apps/nx-api/src/shared/nx05/nx05-post-opening-inventory.ts
// ⭐ 總帳脊椎 C6：期初存貨開帳（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md §14「期初開帳」
//
// 🔴 為什麼非做不可：從舊系統承接進來的庫存**背後沒有任何營運事件**——
//   恆迎 2.32 億的庫存餘額只有兩筆流水（還都是測試留下的）。
//   接再多過帳點也生不出那 2.32 億的分錄，因為沒有單據可以觸發。
//   ⭐ 所以「總帳存貨 ＝ 庫存餘額表」這一項，只能靠期初開帳收斂。
//
// 🔴 這一支跟其他過帳點的**行為刻意相反**：
//   其他過帳點是掛在營運交易裡的鉤子 → 有問題就 skip、絕不擋營運流程。
//   這一支是**人明確按下去的一次性動作** → 有問題就**大聲報錯**，
//   把缺什麼講清楚。開帳這種事悄悄跳過一半才是災難。
//   ⚠ 而且過帳後不可逆（要改只能紅字沖銷）——所以寧可停下來問，不要猜。
//
// 🔴 金額怎麼算：**開帳日當天的存貨價值**
//     ＝ 現在的庫存餘額 − 開帳日之後發生的庫存異動
//   ⭐ 這個算法對任何開帳日都成立：開帳日設在今天就等於現在的餘額；
//      設在過去就會把之後的進出貨扣回去（那些進出貨自己會有各自的傳票）。
//
// 🔴 對方科目走 3103 期初承接權益，⛔ 不是 3201 累積盈餘——
//   那個數字的意思是「過去營運賺了多少」，把承接進來的存貨塞進去等於讓它說謊。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { postByRule } from './nx05-post-by-rule';

type Dec = PrismaNs.Decimal;
const D0 = new PrismaNs.Decimal(0);

export interface OpeningLine {
  departmentId: string;
  departmentName: string;
  /** 這個成本中心底下有哪些倉。 */
  warehouseCodes: string[];
  amount: Dec;
  voucherId: string;
  voucherDocNo: string;
}

export interface OpeningResult {
  totalAmount: Dec;
  lines: OpeningLine[];
}

/**
 * ⭐ 期初存貨開帳：把現有庫存做成開帳分錄。
 *
 * ⚠ **一次性、且過帳後不可逆**。每個成本中心一張傳票——
 *    這樣「哪一家店帶進來多少貨」在帳上就是分開的，不是一坨總數。
 */
export async function postOpeningInventory(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; openingDate: Date; userId: string },
): Promise<OpeningResult> {
  const { tenantId, openingDate } = p;

  // ── 擋重複：開帳只能做一次 ──
  const done = await tx.nx05Voucher.findFirst({
    where: { tenantId, sourceDocType: 'OPEN' },
    select: { docNo: true },
  });
  if (done) {
    throw new BadRequestException(
      `期初開帳已經做過了（傳票 ${done.docNo}）。⛔ 不可以再做一次——` +
        '那會讓存貨憑空多一倍。要修正只能對原傳票做紅字沖銷',
    );
  }

  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: 'OPEN-BF', status: 'ACTIVE', isActive: true },
    select: { id: true },
  });
  if (!rule) {
    throw new BadRequestException(
      '期初開帳失敗：找不到啟用中的交易代號 OPEN-BF（期初存貨·承接來源不明）。請先套用過帳規則',
    );
  }

  const period = await tx.nx05FiscalPeriod.findFirst({
    where: {
      tenantId,
      startDate: { lte: openingDate },
      endDate: { gte: openingDate },
      status: 'OPEN',
    },
    select: { code: true },
  });
  if (!period) {
    const ymd = openingDate.toISOString().slice(0, 10);
    throw new BadRequestException(
      `期初開帳失敗：${ymd} 沒有開帳中的會計期間。請先建立該期間並設為開帳中`,
    );
  }

  // ── 各倉的存貨價值 ──
  const balances = await tx.nx03StockBalance.groupBy({
    by: ['warehouseId'],
    where: { tenantId },
    _sum: { stockValue: true },
  });
  if (balances.length === 0) {
    throw new BadRequestException('期初開帳失敗：庫存餘額表是空的，沒有東西可以開帳');
  }

  // ── 開帳日「之後」發生的庫存異動（要從現在的餘額扣回去）──
  const after = await tx.nx03StockLedger.groupBy({
    by: ['warehouseId', 'movementType'],
    where: { tenantId, movementDate: { gt: openingDate } },
    _sum: { totalCost: true },
  });
  const afterByWh = new Map<string, Dec>();
  for (const g of after) {
    const amt = new PrismaNs.Decimal(g._sum.totalCost ?? 0);
    const cur = afterByWh.get(g.warehouseId) ?? D0;
    afterByWh.set(g.warehouseId, g.movementType === 'I' ? cur.add(amt) : cur.sub(amt));
  }

  // ── 倉 → 據點 → 成本中心 ──
  const warehouses = await tx.nx01Warehouse.findMany({
    where: { tenantId, id: { in: balances.map((b) => b.warehouseId) } },
    select: {
      id: true,
      code: true,
      site: { select: { code: true, name: true, costCenterDeptId: true } },
    },
  });
  const whInfo = new Map(warehouses.map((w) => [w.id, w]));

  const missing: string[] = [];
  const byDept = new Map<string, { amount: Dec; warehouseCodes: string[] }>();
  for (const b of balances) {
    const wh = whInfo.get(b.warehouseId);
    const deptId = wh?.site?.costCenterDeptId ?? null;
    if (!deptId) {
      missing.push(`${wh?.code ?? b.warehouseId}（據點 ${wh?.site?.name ?? '未知'}）`);
      continue;
    }
    const value = new PrismaNs.Decimal(b._sum.stockValue ?? 0);
    const movedAfter = afterByWh.get(b.warehouseId) ?? D0;
    const opening = value.sub(movedAfter);
    const cur = byDept.get(deptId) ?? { amount: D0, warehouseCodes: [] };
    cur.amount = cur.amount.add(opening);
    if (wh?.code) cur.warehouseCodes.push(wh.code);
    byDept.set(deptId, cur);
  }

  // 🔴 大聲報錯而不是悄悄跳過：少開一個倉，帳從第一天就是錯的
  if (missing.length > 0) {
    throw new BadRequestException(
      `期初開帳失敗：這些倉庫的據點還沒設定對應成本中心，開了帳會少掉它們的存貨——` +
        `${missing.join('、')}。請先到據點主檔補上「對應成本中心」`,
    );
  }

  const depts = await tx.nx01Department.findMany({
    where: { tenantId, id: { in: [...byDept.keys()] } },
    select: { id: true, name: true, isActive: true },
  });
  const deptName = new Map(depts.map((d) => [d.id, d.name]));
  const inactive = depts.filter((d) => !d.isActive).map((d) => d.name);
  if (inactive.length > 0) {
    throw new BadRequestException(
      `期初開帳失敗：這些成本中心已停用——${inactive.join('、')}。請先啟用或改指定其他成本中心`,
    );
  }

  const negative = [...byDept.entries()].filter(([, v]) => v.amount.isNegative());
  if (negative.length > 0) {
    throw new BadRequestException(
      `期初開帳失敗：這些成本中心算出來的期初存貨是負數——` +
        `${negative.map(([id, v]) => `${deptName.get(id) ?? id}（${v.amount.toString()}）`).join('、')}。` +
        '負的期初存貨不是會計問題、是資料問題（多半是開帳日設得太早，之後的出貨比當時的庫存還多），請先確認開帳日',
    );
  }

  // ── 每個成本中心一張傳票 ──
  const lines: OpeningLine[] = [];
  let total = D0;
  for (const [departmentId, v] of [...byDept.entries()].sort()) {
    if (v.amount.isZero()) continue; // 這家店開帳日當天沒有存貨，不需要傳票
    const name = deptName.get(departmentId) ?? departmentId;
    const r = await postByRule(tx, {
      tenantId,
      actorUserId: p.userId,
      ruleCode: 'OPEN-BF',
      voucherDate: openingDate,
      source: { docType: 'OPEN', docId: departmentId, docNo: `OPEN-${name}` },
      origin: 'BATCH',
      summary: `期初存貨開帳 ${name}（${v.warehouseCodes.sort().join('、')}）`,
      amounts: { AMOUNT: v.amount },
      dimensions: { departmentId },
    });
    lines.push({
      departmentId,
      departmentName: name,
      warehouseCodes: v.warehouseCodes.sort(),
      amount: v.amount,
      voucherId: r.voucherId,
      voucherDocNo: r.docNo,
    });
    total = total.add(v.amount);
  }

  if (lines.length === 0) {
    throw new BadRequestException('期初開帳失敗：算出來的期初存貨全部是 0，沒有東西可以開帳');
  }

  return { totalAmount: total, lines };
}
