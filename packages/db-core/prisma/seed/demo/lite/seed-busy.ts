// packages/db-core/prisma/seed/demo/lite/seed-busy.ts
// @FUNCTION_CODE SYS-DEMO-LITE-004-F01
// LITE busy 期 7 天異常情境 SO（Crown Q8 拍板）
//
// LITE 分布：
//   8 type='S' 本倉夠（直接出貨）
//   0 type='T' 自倉調撥（LITE 單倉沒有）
//   3 type='G' adopted（採用 QT、TI 已建）
//   2 type='G' pending（RFQ 中間態、tiId=null）
//   1 type='B' 客戶預訂
//   合計 14 SO（接近意圖 §3.1 7 天 ~15 筆假設）

import { anchorYyyymm, daysAfterAnchor, daysBeforeAnchor } from '../lib/anchor-date';
import {
  ensureCo,
  ensureQt,
  ensureRfqStub,
  ensureSo,
  ensureTi,
  makeDemoDocNo,
  type DemoContext,
} from '../lib/builders';
import type { MasterResult } from './seed-master';

const LITE_BUSY_TYPE_S = 8;
const LITE_BUSY_TYPE_G_ADOPTED = 3;
const LITE_BUSY_TYPE_G_PENDING = 2;
const LITE_BUSY_TYPE_B = 1;

export async function seedLiteBusy(
  ctx: DemoContext,
  tenantCode: 'LITE',
  master: MasterResult,
): Promise<{ soCount: number; rfqCount: number; qtCount: number; tiCount: number; coCount: number }> {
  const { customers, inquiryPartners, parts, locations } = master;
  const wh = ctx.warehouses[0];
  const locForWh = locations.find((l) => l.warehouseId === wh.id);
  if (!locForWh) throw new Error('LITE no location for primary warehouse');

  let soCount = 0;
  let rfqCount = 0;
  let qtCount = 0;
  let tiCount = 0;
  let coCount = 0;

  let soSeqIdx = 100; // busy 期序號從 100 起，跟 dormant 期 1~30 區隔

  // ----- 8 筆 type='S' 本倉夠 -----
  for (let i = 0; i < LITE_BUSY_TYPE_S; i++) {
    const customer = customers[(i * 3 + 1) % customers.length];
    // 從非缺貨料號選（前 70%）
    const part = parts[(i * 5 + 7) % Math.floor(parts.length * 0.7)];
    const soDate = daysBeforeAnchor(7 - Math.floor(i / 2));
    const expectedDelivery = daysAfterAnchor(2 + (i % 3));
    const docNo = makeDemoDocNo('SO', wh.code, soSeqIdx++, anchorYyyymm());
    await ensureSo(ctx, {
      docNo,
      customerId: customer.id,
      soDate,
      expectedDeliveryDate: expectedDelivery,
      warehouseId: wh.id,
      status: 'CONFIRMED',
      lineItems: [
        {
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          warehouseId: wh.id,
          locationId: locForWh.id,
          qty: 1 + (i % 3),
          unitPrice: part.unitPrice,
          transferSourceType: 'S',
          transferStatus: 'C',
          fulfillStatus: 'PK', // 撿貨中（仍佔 reserved_qty）
        },
      ],
    });
    soCount++;
  }

  // ----- 3 筆 type='G' adopted（已採用 QT，TI 已建）-----
  for (let i = 0; i < LITE_BUSY_TYPE_G_ADOPTED; i++) {
    const customer = customers[(i + 1) % customers.length];
    const part = parts[(i * 11) % parts.length];
    const inquiryPartner = inquiryPartners[i % inquiryPartners.length];
    const soDate = daysBeforeAnchor(5 - i);
    const expectedDelivery = daysAfterAnchor(5 + i);
    const qty = 2 + i;
    const quotedPrice = Math.round(part.unitPrice * 0.7); // 同行批發價

    // 建 SO with type='G'
    const soDocNo = makeDemoDocNo('SO', wh.code, soSeqIdx++, anchorYyyymm());
    const so = await ensureSo(ctx, {
      docNo: soDocNo,
      customerId: customer.id,
      soDate,
      expectedDeliveryDate: expectedDelivery,
      warehouseId: wh.id,
      status: 'CONFIRMED',
      lineItems: [
        {
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          warehouseId: wh.id,
          locationId: locForWh.id,
          qty,
          unitPrice: part.unitPrice,
          transferSourceType: 'G',
          transferSourceRef: inquiryPartner.id,
          transferStatus: 'I', // 採用 QT 後 ensureTi 會 update 為 'C'
          fulfillStatus: 'W',
        },
      ],
    });
    soCount++;

    // 建 RFQ stub（D4 模擬）
    const rfqDocNo = makeDemoDocNo('RF', wh.code, soSeqIdx + 100, anchorYyyymm());
    const rfq = await ensureRfqStub(ctx, {
      docNo: rfqDocNo,
      sourceSoItemId: so.soItemIds[0],
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      warehouseId: wh.id,
      qty,
      rfqDate: soDate,
      supplierId: inquiryPartner.id,
      status: 'CLOSED', // 已採用後 RFQ 是 CLOSED
    });
    rfqCount++;

    // 建 1~2 個 QT（其中一個是採用的、其他是被連帶 reject）
    const adoptedQtDate = new Date(soDate.getTime() + 1 * 24 * 60 * 60 * 1000); // SO 後 1 天
    const adoptedQt = await ensureQt(ctx, {
      rfqId: rfq.rfqId,
      inquiryPartnerId: inquiryPartner.id,
      quotedPrice,
      quotedQuantity: qty,
      status: 'A', // AGREED
      leadDays: 3,
      createdAt: adoptedQtDate,
    });
    qtCount++;

    // 多家詢價（一個其他 partner 報價、被 reject）
    if (inquiryPartners.length > 1) {
      const otherPartner = inquiryPartners[(i + 1) % inquiryPartners.length];
      const otherQtDate = new Date(soDate.getTime() + 2 * 60 * 60 * 1000);
      await ensureQt(ctx, {
        rfqId: rfq.rfqId,
        inquiryPartnerId: otherPartner.id,
        quotedPrice: Math.round(quotedPrice * 1.1),
        quotedQuantity: qty,
        status: 'R',
        rejectReason: `因採用 QT-${adoptedQt.id}`,
        leadDays: 5,
        createdAt: otherQtDate,
      });
      qtCount++;
    }

    // 建 TI（B5 採用後）
    const tiDocNo = makeDemoDocNo('TI', wh.code, soSeqIdx + 200, anchorYyyymm());
    await ensureTi(ctx, {
      docNo: tiDocNo,
      rfqId: rfq.rfqId,
      sourceSoItemId: so.soItemIds[0],
      partnerId: inquiryPartner.id,
      warehouseId: wh.id,
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      qty,
      unitCost: quotedPrice,
      tiDate: adoptedQtDate,
      status: 'D',
    });
    tiCount++;
  }

  // ----- 2 筆 type='G' pending（RFQ 中間態、tiId=null、QT 還沒採用）-----
  for (let i = 0; i < LITE_BUSY_TYPE_G_PENDING; i++) {
    const customer = customers[(i * 4 + 2) % customers.length];
    const part = parts[(i * 13 + 17) % parts.length];
    const inquiryPartner = inquiryPartners[(i + 1) % inquiryPartners.length];
    const soDate = daysBeforeAnchor(3 - i);
    const expectedDelivery = daysAfterAnchor(7 + i);
    const qty = 3 + i;

    const soDocNo = makeDemoDocNo('SO', wh.code, soSeqIdx++, anchorYyyymm());
    const so = await ensureSo(ctx, {
      docNo: soDocNo,
      customerId: customer.id,
      soDate,
      expectedDeliveryDate: expectedDelivery,
      warehouseId: wh.id,
      status: 'CONFIRMED',
      lineItems: [
        {
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          warehouseId: wh.id,
          locationId: locForWh.id,
          qty,
          unitPrice: part.unitPrice,
          transferSourceType: 'G',
          transferSourceRef: inquiryPartner.id,
          transferStatus: 'I', // 中間態：補貨中
          fulfillStatus: 'W',
        },
      ],
    });
    soCount++;

    const rfqDocNo = makeDemoDocNo('RF', wh.code, soSeqIdx + 100, anchorYyyymm());
    const rfq = await ensureRfqStub(ctx, {
      docNo: rfqDocNo,
      sourceSoItemId: so.soItemIds[0],
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      warehouseId: wh.id,
      qty,
      rfqDate: soDate,
      supplierId: inquiryPartner.id,
      status: 'REPLIED', // 已收到 QT、等採購採用
    });
    rfqCount++;

    // 1~2 個 QT 都是 pending status
    for (let q = 0; q < 1 + (i % 2); q++) {
      const qtPartner = inquiryPartners[(i + q) % inquiryPartners.length];
      const qtDate = new Date(soDate.getTime() + (q + 1) * 60 * 60 * 1000);
      await ensureQt(ctx, {
        rfqId: rfq.rfqId,
        inquiryPartnerId: qtPartner.id,
        quotedPrice: Math.round(part.unitPrice * (0.65 + q * 0.05)),
        quotedQuantity: qty,
        status: 'P', // PENDING
        leadDays: 3 + q,
        createdAt: qtDate,
      });
      qtCount++;
    }
  }

  // ----- 1 筆 type='B' 客戶預訂 -----
  for (let i = 0; i < LITE_BUSY_TYPE_B; i++) {
    const customer = customers[i % customers.length];
    // 從缺貨料號選（後 30%）
    const part = parts[Math.floor(parts.length * 0.7) + (i % Math.ceil(parts.length * 0.3))];
    const soDate = daysBeforeAnchor(2);
    const expectedDelivery = daysAfterAnchor(14);
    const qty = 5 + i;

    const soDocNo = makeDemoDocNo('SO', wh.code, soSeqIdx++, anchorYyyymm());
    const so = await ensureSo(ctx, {
      docNo: soDocNo,
      customerId: customer.id,
      soDate,
      expectedDeliveryDate: expectedDelivery,
      warehouseId: wh.id,
      status: 'CONFIRMED',
      lineItems: [
        {
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          warehouseId: wh.id,
          locationId: locForWh.id,
          qty,
          unitPrice: part.unitPrice,
          transferSourceType: 'B',
          transferStatus: 'I',
          fulfillStatus: 'W',
        },
      ],
    });
    soCount++;

    const coDocNo = makeDemoDocNo('CO', wh.code, soSeqIdx + 300, anchorYyyymm());
    await ensureCo(ctx, {
      docNo: coDocNo,
      customerId: customer.id,
      sourceSoItemId: so.soItemIds[0],
      warehouseId: wh.id,
      partId: part.id,
      qty,
      coDate: soDate,
      expectedFulfillDate: expectedDelivery,
      status: 'P',
    });
    coCount++;
  }

  return { soCount, rfqCount, qtCount, tiCount, coCount };
}
