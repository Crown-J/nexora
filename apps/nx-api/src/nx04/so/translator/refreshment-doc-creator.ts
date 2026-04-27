// apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts
// D4 翻譯器 — 對 transferSourceType != 'S' 的 line item 建對應補貨單。
//
// 三種補貨單派發（D4-impl §3.4）：
//   T (transfer) → INSERT nx03_st + nx03_st_item（sourceSoItemId 必填）→ UPDATE so_item.stId
//   G (inquiry)  → INSERT nx02_rfq + nx02_rfq_item（stub，sourceSoItemId 寫入給 B5 採用 QT 反查 SO line item 用）→ so_item.tiId 留 null（B5 採用 QT 才填）
//   B (co)       → INSERT nx04_co（sourceSoItemId 必填）→ UPDATE so_item.coId
//
// 建好後 UPDATE line item.transferStatus = 'I'（D4 意圖 §3.5「立刻變」）

import { Injectable } from '@nestjs/common';
import { Prisma as PrismaNs, type Prisma } from 'db-core';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';

import type { TranslateLineItemDto } from './dto/translate-so.dto';

interface InsertedSoItem {
  id: string;
  partId: string;
  warehouseId: string;
  qty: PrismaNs.Decimal;
  transferSourceType: string;
  transferSourceRef: string | null;
  partNo: string;
  partName: string;
}

export interface RefreshmentResult {
  itIds: string[]; // ST 單 ID 們
  rfqIds: string[]; // RFQ 殼 ID 們
  coIds: string[]; // CO 單 ID 們
}

@Injectable()
export class RefreshmentDocCreator {
  async createForLineItems(args: {
    tx: Prisma.TransactionClient;
    user: RequestUser;
    tenantId: string;
    so: { id: string; docNo: string; warehouseId: string; warehouseCode: string; customerId: string };
    items: InsertedSoItem[];
    dtoLineItems: TranslateLineItemDto[]; // 對應 items 的原 DTO（同 index）
  }): Promise<RefreshmentResult> {
    const result: RefreshmentResult = { itIds: [], rfqIds: [], coIds: [] };

    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      const dto = args.dtoLineItems[i];
      const ref = dto.transferSourceRef?.trim() || null;

      switch (item.transferSourceType) {
        case 'S':
          // 本倉夠，不需補貨；transfer_status 已是 'C'（INSERT 時設定）
          continue;

        case 'T': {
          if (!ref) continue; // 校驗應已擋下，這裡保險
          const stId = await this.createSt(args.tx, args.user, args.tenantId, args.so, item, ref);
          result.itIds.push(stId);
          await args.tx.nx04SoItem.update({
            where: { id: item.id },
            data: { stId, transferStatus: 'I', updatedBy: args.user.sub },
          });
          break;
        }

        case 'G': {
          if (!ref) continue;
          const rfqId = await this.createRfqStub(args.tx, args.user, args.tenantId, args.so, item, ref);
          result.rfqIds.push(rfqId);
          // ⚠️ B5 stub：line item.tiId 留 null。B5 spec 後 RFQ 收到報價變 TI 時才填。
          await args.tx.nx04SoItem.update({
            where: { id: item.id },
            data: { transferStatus: 'I', updatedBy: args.user.sub },
          });
          break;
        }

        case 'B': {
          const coId = await this.createCo(args.tx, args.user, args.tenantId, args.so, item);
          result.coIds.push(coId);
          await args.tx.nx04SoItem.update({
            where: { id: item.id },
            data: { coId, transferStatus: 'I', updatedBy: args.user.sub },
          });
          break;
        }
      }
    }

    return result;
  }

  // ----- 補貨單建立 helpers -----

  private async createSt(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    so: { id: string; warehouseId: string; warehouseCode: string },
    item: InsertedSoItem,
    fromWarehouseId: string,
  ): Promise<string> {
    const docNo = await this.allocStDocNo(tx, tenantId, so.warehouseCode);
    const st = await tx.nx03St.create({
      data: {
        tenantId,
        docNo,
        stDate: new Date(),
        fromWarehouseId,
        toWarehouseId: so.warehouseId, // SO 出貨倉 = ST 目標倉
        status: 'DRAFT',
        stType: 'A',
        triggerSource: 'S',
        refSoId: so.id,
        createdBy: user.sub,
        updatedBy: user.sub,
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
        qty: item.qty,
        unitCost: new PrismaNs.Decimal(0),
        sourceSoItemId: item.id, // D3 加的反向追蹤
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return st.id;
  }

  private async createRfqStub(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    so: { warehouseId: string; warehouseCode: string },
    item: InsertedSoItem,
    inquiryPartnerId: string,
  ): Promise<string> {
    const docNo = await this.allocRfqDocNo(tx, tenantId, so.warehouseCode);
    const rfq = await tx.nx02Rfq.create({
      data: {
        tenantId,
        docNo,
        rfqDate: new Date(),
        supplierId: inquiryPartnerId,
        currency: 'TWD',
        status: 'DRAFT',
        warehouseId: so.warehouseId,
        rfqType: 'P', // 同行調貨詢價
        rfqReason: 'T',
        sourceSoItemId: item.id, // B5 反查路徑：採用 QT 後透過此欄位找回對應 SO line item
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true },
    });
    await tx.nx02RfqItem.create({
      data: {
        rfqId: rfq.id,
        lineNo: 1,
        partId: item.partId,
        partNo: item.partNo,
        partName: item.partName,
        qty: item.qty,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return rfq.id;
  }

  private async createCo(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    so: { warehouseId: string; warehouseCode: string; customerId: string },
    item: InsertedSoItem,
  ): Promise<string> {
    const docNo = await this.allocCoDocNo(tx, tenantId, so.warehouseCode);
    const co = await tx.nx04Co.create({
      data: {
        tenantId,
        warehouseId: so.warehouseId,
        docNo,
        coDate: new Date(),
        customerId: so.customerId,
        partId: item.partId,
        qty: item.qty,
        status: 'P',
        sourceSoItemId: item.id,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true },
    });
    return co.id;
  }

  // ----- doc number allocation（簡化版，跟既有 allocNx04DocNo 同邏輯） -----

  private async allocStDocNo(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseCode: string,
  ): Promise<string> {
    return this.allocDocNoGeneric(tx, tenantId, warehouseCode, 'ST', 'nx03St');
  }
  private async allocRfqDocNo(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseCode: string,
  ): Promise<string> {
    return this.allocDocNoGeneric(tx, tenantId, warehouseCode, 'RF', 'nx02Rfq');
  }
  private async allocCoDocNo(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseCode: string,
  ): Promise<string> {
    return this.allocDocNoGeneric(tx, tenantId, warehouseCode, 'CO', 'nx04Co');
  }

  private async allocDocNoGeneric(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseCode: string,
    prefix: string,
    model: 'nx03St' | 'nx02Rfq' | 'nx04Co',
  ): Promise<string> {
    const y = new Date();
    const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
    const head = `${prefix}-${yyyymm}-${warehouseCode}-`;
    let last: { docNo: string } | null = null;
    if (model === 'nx03St') {
      last = await tx.nx03St.findFirst({
        where: { tenantId, docNo: { startsWith: head } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
    } else if (model === 'nx02Rfq') {
      last = await tx.nx02Rfq.findFirst({
        where: { tenantId, docNo: { startsWith: head } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
    } else {
      last = await tx.nx04Co.findFirst({
        where: { tenantId, docNo: { startsWith: head } },
        orderBy: { docNo: 'desc' },
        select: { docNo: true },
      });
    }
    let next = 1;
    if (last?.docNo) {
      const tail = last.docNo.split('-').pop() ?? '';
      const num = parseInt(tail, 10);
      if (Number.isFinite(num)) next = num + 1;
    }
    return `${head}${String(next).padStart(5, '0')}`;
  }
}
