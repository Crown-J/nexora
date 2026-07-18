// apps/nx-api/src/shared/nx03/nx03-auto-transfer-from-so.ts
// SO CONFIRMED transit 時自動建 NX03 ST 調撥單（缺貨時從最近倉庫支援、冪等）
//
// 對齊：
//   - TASK-NX04-IMPL-01 Phase 4 commit 4b
//   - Crown Q-C1=C 兩階段：DRAFT 提示 / CONFIRMED 強制
//   - overview §7.3 自動調撥邏輯（客戶預設據點無庫存 → 最近倉庫支援）
//   - 既有範式：apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts createSt（翻譯流用）
//
// 業務語意：
//   - SO CONFIRMED 時 application 層判斷每 SoItem 目標倉庫實際庫存
//   - 不足 → 找其他倉庫支援（warehouse.sortNo asc 排序、第一個足量倉）
//   - 自動建 NX03 ST（stType='A' 自動 / triggerSource='S' SO 缺貨）
//   - 更新 SoItem.stId + transferStatus='I' + transferSourceType='T'
//
// 冪等策略：
//   - SoItem.stId 已存在 → skip（避免重複建 ST）

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx03DocNo } from './nx03-doc-no';

export type AutoTransferResult = {
  soId: string;
  totalItemsChecked: number;
  totalItemsRequiredTransfer: number;
  totalStCreated: number;
  totalItemsAlreadyHandled: number;
  createdStIds: string[];
};

/**
 * SO CONFIRMED 時自動建 ST 調撥（缺貨時從最近倉庫支援）。回傳統計結果。
 * 若 SoItem 目標倉庫足量 / 已有 stId / transferStatus='C' → skip
 * 若無倉庫支援 → throw BadRequest（提示業務員手動處理）
 */
export async function autoCreateTransferFromSo(
  tx: Prisma.TransactionClient,
  p: { tenantId: string; soId: string; userId: string },
): Promise<AutoTransferResult> {
  // 1. load SO + SoItems
  const so = await tx.nx04So.findFirst({
    where: { id: p.soId, tenantId: p.tenantId },
    select: {
      id: true,
      warehouseId: true,
      warehouse: { select: { code: true } },
      rev_Nx04SoItem_soId: {
        select: {
          id: true,
          partId: true,
          partNo: true,
          partName: true,
          warehouseId: true,
          qty: true,
          stId: true,
          transferStatus: true,
          transferSourceType: true,
        },
      },
    },
  });
  if (!so) throw new BadRequestException('SO not found for auto-transfer');

  const result: AutoTransferResult = {
    soId: p.soId,
    totalItemsChecked: 0,
    totalItemsRequiredTransfer: 0,
    totalStCreated: 0,
    totalItemsAlreadyHandled: 0,
    createdStIds: [],
  };

  for (const item of so.rev_Nx04SoItem_soId) {
    result.totalItemsChecked++;

    // 冪等 skip：已有 stId 或 transferStatus='C' 已完成
    if (item.stId || item.transferStatus === 'C') {
      result.totalItemsAlreadyHandled++;
      continue;
    }

    // 查目標倉庫實際庫存
    const targetBalance = await tx.nx03StockBalance.findFirst({
      where: { tenantId: p.tenantId, partId: item.partId, warehouseId: item.warehouseId },
      select: { onHandQty: true, reservedQty: true },
    });
    const onHand = targetBalance
      ? new PrismaNs.Decimal(targetBalance.onHandQty).sub(new PrismaNs.Decimal(targetBalance.reservedQty))
      : new PrismaNs.Decimal(0);
    const requiredQty = new PrismaNs.Decimal(item.qty);

    if (onHand.gte(requiredQty)) {
      // 足量、不需調撥——誤標調撥自動轉回現貨（執行長 2026-07-18 拍板；PICK-CHAIN 後端版）
      // 原本只 skip、行卡 transferStatus='P' 待補且無單據會來解鎖；轉 S/C 直接進「等撿貨」
      await tx.nx04SoItem.update({
        where: { id: item.id },
        data: { transferSourceType: 'S', transferStatus: 'C', updatedBy: p.userId },
      });
      continue;
    }

    result.totalItemsRequiredTransfer++;

    // 找其他倉庫支援（warehouse.sortNo asc、不含 target、有足量 onHand）
    const candidateBalances = await tx.nx03StockBalance.findMany({
      where: {
        tenantId: p.tenantId,
        partId: item.partId,
        warehouseId: { not: item.warehouseId },
      },
      select: {
        warehouseId: true,
        onHandQty: true,
        reservedQty: true,
        warehouse: { select: { code: true, sortNo: true } },
      },
      orderBy: { warehouse: { sortNo: 'asc' } },
    });

    const sourceWh = candidateBalances.find((b) => {
      const avail = new PrismaNs.Decimal(b.onHandQty).sub(new PrismaNs.Decimal(b.reservedQty));
      return avail.gte(requiredQty);
    });

    if (!sourceWh) {
      throw new BadRequestException(
        `SoItem ${item.id} (part=${item.partNo}, qty=${requiredQty.toString()}): no warehouse has sufficient stock (target ${item.warehouseId} onHand=${onHand.toString()})`,
      );
    }

    // 建 ST（仿 RefreshmentDocCreator.createSt 範式）
    const docNo = await allocNx03DocNo(tx, p.tenantId, 'ST', sourceWh.warehouse.code);
    const st = await tx.nx03St.create({
      data: {
        tenantId: p.tenantId,
        docNo,
        stDate: new Date(),
        fromWarehouseId: sourceWh.warehouseId,
        toWarehouseId: item.warehouseId, // SO 目標倉 = ST 目標倉
        status: 'DRAFT',
        stType: 'A', // A=自動配貨系統產生
        triggerSource: 'S', // S=SO 銷貨需求缺貨
        refSoId: so.id,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
      select: { id: true },
    });

    await tx.nx03StItem.create({
      data: {
        stId: st.id,
        lineNo: 1,
        partId: item.partId,
        partNo: item.partNo,
        partName: item.partName,
        qty: requiredQty,
        unitCost: new PrismaNs.Decimal(0), // 過帳時抓 stock_balance.avgCost
        sourceSoItemId: item.id, // D3 反向追蹤
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });

    // 更新 SoItem.stId + transferStatus='I' 補貨中 + transferSourceType='T' 自倉調撥
    await tx.nx04SoItem.update({
      where: { id: item.id },
      data: {
        stId: st.id,
        transferStatus: 'I',
        transferSourceType: 'T',
        updatedBy: p.userId,
      },
    });

    result.totalStCreated++;
    result.createdStIds.push(st.id);
  }

  return result;
}
