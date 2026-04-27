// apps/nx-api/src/nx03/stock-reservation/stock-reservation.service.ts
// B2 庫存反查 service — 對應意圖版 v1.1 §3.1 + §3.2 + §5.1~§5.5
//
// 2 個 method：
//   getStockSummary  §3.1  庫存總覽（直接讀 stock_balance，D3 trigger 已維護）
//   getReservations  §3.2  承諾來源反查（接龍鎖：SO line item → IT/TI/CO/RFQ）
//
// 純讀，無 transaction / advisory lock / retry。
// N+1 防範：(1) SoItem.findMany 一次 include 所有反查 relations
//          (2) user lookup 用 IN 一次抓所有 createdBy（非 N+1，2 round-trip）

import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

const SUMMARY_SEL = {
  id: true,
  partId: true,
  warehouseId: true,
  onHandQty: true,
  reservedQty: true,
  availableQty: true,
  inTransitQty: true,
  avgCost: true,
  stockValue: true,
  lastInAt: true,
  lastOutAt: true,
  lastMoveAt: true,
  part: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
} as const;

const RESERVATION_SEL = {
  id: true,
  soId: true,
  partId: true,
  warehouseId: true,
  qty: true,
  transferSourceType: true,
  transferStatus: true,
  fulfillStatus: true,
  stId: true,
  tiId: true,
  coId: true,
  so: {
    select: {
      id: true,
      docNo: true,
      soDate: true,
      status: true,
      expectedDeliveryDate: true,
      createdBy: true,
      customer: { select: { id: true, name: true } },
    },
  },
  st: {
    select: {
      id: true,
      docNo: true,
      status: true,
      stDate: true,
      postedAt: true,
      receivedAt: true,
      fromWarehouse: { select: { id: true, code: true, name: true } },
      toWarehouse: { select: { id: true, code: true, name: true } },
    },
  },
  ti: {
    select: {
      id: true,
      docNo: true,
      status: true,
      tiDate: true,
      subtotal: true,
      partner: { select: { id: true, name: true } },
    },
  },
  co: {
    select: {
      id: true,
      docNo: true,
      status: true,
      coDate: true,
      expectedFulfillDate: true,
      customer: { select: { id: true, name: true } },
    },
  },
  rev_Nx02Rfq_sourceSoItemId: {
    select: {
      id: true,
      docNo: true,
      status: true,
      rev_Nx02Qt_rfqId: { select: { inquiryPartnerId: true, status: true } },
    },
  },
} as const;

type ReservationRaw = Prisma.Nx04SoItemGetPayload<{ select: typeof RESERVATION_SEL }>;

@Injectable()
export class Nx03StockReservationService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== §3.1 庫存總覽 =====

  async getStockSummary(user: RequestUser, partId: string, warehouseId: string) {
    const tenantId = requireTenantId(user);
    const balance = await this.prisma.nx03StockBalance.findFirst({
      where: { tenantId, partId, warehouseId },
      select: SUMMARY_SEL,
    });
    if (!balance) {
      throw new NotFoundException(
        `stock_balance not found for part=${partId} warehouse=${warehouseId}`,
      );
    }
    return balance;
  }

  // ===== §3.2 承諾來源反查 =====

  async getReservations(user: RequestUser, partId: string, warehouseId: string) {
    const tenantId = requireTenantId(user);

    // Step 1: 一次撈 SoItem + 所有反查 relations（避免 N+1）
    // 只列「未完成」：transferStatus != 'C' OR fulfillStatus != 'F'（§4.1）
    // 排序：expectedDeliveryDate ASC NULLS LAST + soDate ASC + docNo ASC（§4.3 / §5.4）
    const items = await this.prisma.nx04SoItem.findMany({
      where: {
        partId,
        warehouseId,
        so: { tenantId }, // tenantId 在 SO header（§5.5 multi-tenant）
        OR: [
          { transferStatus: { not: 'C' } },
          { fulfillStatus: { not: 'F' } },
        ],
      },
      orderBy: [
        { so: { expectedDeliveryDate: { sort: 'asc', nulls: 'last' } } },
        { so: { soDate: 'asc' } },
        { so: { docNo: 'asc' } },
      ],
      select: RESERVATION_SEL,
    });

    if (items.length === 0) {
      return { partId, warehouseId, items: [] };
    }

    // Step 2: 收集 createdBy → 一次抓所有 user.userName（§2 取捨 5 方案 b）
    // 注意：creator = 建單者，不一定等於業務歸屬。
    //       intent v1.1 §5.2 已明確此語意，未來若需「業務歸屬」起 schema patch 加 salespersonId FK。
    const creatorIds = [...new Set(items.map((it) => it.so.createdBy))];
    const creators = await this.prisma.nx01User.findMany({
      where: { id: { in: creatorIds }, tenantId },
      select: { id: true, userName: true },
    });
    const creatorMap = new Map(creators.map((u) => [u.id, u.userName]));

    // Step 3: 把 raw row 轉成接龍鎖結構（§5.2 意圖）
    return {
      partId,
      warehouseId,
      items: items.map((it) => this.shapeReservationItem(it, creatorMap)),
    };
  }

  // ===== private helpers =====

  private shapeReservationItem(raw: ReservationRaw, creatorMap: Map<string, string>) {
    return {
      soLineItem: {
        id: raw.id,
        soId: raw.soId,
        partId: raw.partId,
        warehouseId: raw.warehouseId,
        qty: raw.qty.toString(),
        transferSourceType: raw.transferSourceType,
        transferStatus: raw.transferStatus,
        fulfillStatus: raw.fulfillStatus,
      },
      so: {
        id: raw.so.id,
        docNo: raw.so.docNo,
        soDate: raw.so.soDate,
        status: raw.so.status,
        expectedDeliveryDate: raw.so.expectedDeliveryDate,
        customerId: raw.so.customer.id,
        customerName: raw.so.customer.name,
        creatorId: raw.so.createdBy,
        creatorName: creatorMap.get(raw.so.createdBy) ?? null,
      },
      refreshmentDoc: this.shapeRefreshmentDoc(raw),
    };
  }

  private shapeRefreshmentDoc(raw: ReservationRaw):
    | { type: 'self'; detail: null }
    | { type: 'transfer'; detail: TransferDetail | null }
    | { type: 'inquiry'; detail: InquiryDetail | null }
    | { type: 'inquiry_pending'; detail: InquiryPendingDetail | null }
    | { type: 'co'; detail: CoDetail | null }
    | { type: 'unknown'; detail: null } {
    switch (raw.transferSourceType) {
      case 'S':
        return { type: 'self', detail: null };

      case 'T':
        if (!raw.st) return { type: 'transfer', detail: null };
        return {
          type: 'transfer',
          detail: {
            stId: raw.st.id,
            docNo: raw.st.docNo,
            status: raw.st.status,
            stDate: raw.st.stDate,
            postedAt: raw.st.postedAt,
            receivedAt: raw.st.receivedAt,
            fromWarehouseId: raw.st.fromWarehouse.id,
            fromWarehouseName: raw.st.fromWarehouse.name,
            toWarehouseId: raw.st.toWarehouse.id,
            toWarehouseName: raw.st.toWarehouse.name,
          },
        };

      case 'G':
        if (raw.ti) {
          // §4.4 已採用 QT：tiId 有值，走 ti relation
          return {
            type: 'inquiry',
            detail: {
              tiId: raw.ti.id,
              docNo: raw.ti.docNo,
              status: raw.ti.status,
              tiDate: raw.ti.tiDate,
              subtotal: raw.ti.subtotal.toString(),
              inquiryPartnerId: raw.ti.partner.id,
              inquiryPartnerName: raw.ti.partner.name,
            },
          };
        }
        // §4.4 中間態：tiId=null，透過 RFQ 反查
        // 1 SoItem ↔ 1 RFQ stub（D4 translator 建立時保證）
        const rfq = raw.rev_Nx02Rfq_sourceSoItemId[0];
        if (!rfq) return { type: 'inquiry_pending', detail: null }; // 異常容錯
        const partnerSet = new Set(rfq.rev_Nx02Qt_rfqId.map((q) => q.inquiryPartnerId));
        return {
          type: 'inquiry_pending',
          detail: {
            rfqId: rfq.id,
            docNo: rfq.docNo,
            rfqStatus: rfq.status,
            qtCount: rfq.rev_Nx02Qt_rfqId.length,
            partnerCount: partnerSet.size,
          },
        };

      case 'B':
        if (!raw.co) return { type: 'co', detail: null };
        return {
          type: 'co',
          detail: {
            coId: raw.co.id,
            docNo: raw.co.docNo,
            status: raw.co.status,
            coDate: raw.co.coDate,
            expectedFulfillDate: raw.co.expectedFulfillDate,
            // CO 是客戶訂單：對象是客戶（intent v1.1 §5.2 已修正，非 vendor）
            customerId: raw.co.customer.id,
            customerName: raw.co.customer.name,
          },
        };

      default:
        return { type: 'unknown', detail: null };
    }
  }
}

// ----- 接龍鎖 detail 型別（讓 TS narrow 順）-----

interface TransferDetail {
  stId: string;
  docNo: string;
  status: string;
  stDate: Date;
  postedAt: Date | null;
  receivedAt: Date | null;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
}

interface InquiryDetail {
  tiId: string;
  docNo: string;
  status: string;
  tiDate: Date;
  subtotal: string;
  inquiryPartnerId: string;
  inquiryPartnerName: string;
}

interface InquiryPendingDetail {
  rfqId: string;
  docNo: string;
  rfqStatus: string;
  qtCount: number;
  partnerCount: number;
}

interface CoDetail {
  coId: string;
  docNo: string;
  status: string;
  coDate: Date;
  expectedFulfillDate: Date | null;
  customerId: string;
  customerName: string;
}
