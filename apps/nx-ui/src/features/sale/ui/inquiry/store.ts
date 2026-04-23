// apps/nx-ui/src/features/sale/ui/inquiry/store.ts
/**
 * R7 Phase 7 同行調貨 store（Zustand）。
 *
 * 全域管理：
 *   - rfqs：RFQ 詢價單（Phase 7-3 開始有初始 3 筆 mock）
 *   - qts：採用後生成的 QT 報價單（Phase 7-4/7-5 產生）
 *   - customerOrders：缺貨分流選項 B 建立的客戶預訂單
 *
 * 關鍵 action：
 *   - adoptVendorQuote：採用某同行 → 自動生成 QT + 更新 RFQ 狀態
 *     （這是 Phase 7 的核心 mutation，實現 spec 的單據鏈 RFQ→QT）
 *
 * 注意：Phase 7 範圍只到 QT。TI / SO 屬 R9。
 */

'use client';

import { create } from 'zustand';

import type {
  CustomerOrder,
  CustomerRef,
  PartRef,
  QT,
  RFQ,
  VendorQuote,
} from './types';
import { TIER_TARGET_MARGIN } from './types';
import { INITIAL_MOCK_RFQS } from './mock-data';

interface RFQStoreState {
  rfqs: RFQ[];
  qts: QT[];
  customerOrders: CustomerOrder[];

  /** 建新 RFQ（由 Step2 缺貨分流選項 A 觸發），回傳生成的 RFQ */
  createRFQ: (input: {
    customer: CustomerRef;
    part: PartRef;
    quantity: number;
    createdBy?: string;
  }) => RFQ;

  /** 建新客戶訂單（缺貨分流選項 B） */
  createCustomerOrder: (input: {
    customer: CustomerRef;
    part: PartRef;
    quantity: number;
    createdBy?: string;
  }) => CustomerOrder;

  /** 新增一筆同行報價到指定 RFQ */
  addVendorQuote: (
    rfqId: string,
    input: Omit<VendorQuote, 'id' | 'quotedAt'>,
  ) => void;

  /** 刪除指定同行報價 */
  removeVendorQuote: (rfqId: string, quoteId: string) => void;

  /** 採用某同行 → 生成 QT + RFQ 標為 adopted，回傳生成的 QT */
  adoptVendorQuote: (rfqId: string, vendorQuoteId: string, finalPrice: number) => QT;

  /** 全部不採用結案 */
  abandonRFQ: (rfqId: string) => void;

  /**
   * TASK-BUSINESS-RESTRUCTURE Phase 3:「考慮看看」直接建立報價（source=direct）。
   * 不走 RFQ 流程,每個 item 各建一張 QT(便於 useHistoryRecord 查單料號)。
   * vendorCost 用進貨成本,suggestedPrice 用 cost × (1 + tierMargin/100)。
   */
  createDirectQTs: (input: {
    customer: CustomerRef;
    items: ReadonlyArray<{
      sku: string;
      name: string;
      quantity: number;
      finalPrice: number;
      cost: number;
    }>;
  }) => QT[];
}

// ────────── helpers ──────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentYYMM(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

function generateDocNumber(prefix: string, existingNumbers: string[]): string {
  const yymm = getCurrentYYMM();
  const numberPrefix = `${prefix}-${yymm}-`;
  const maxSeq = existingNumbers
    .filter((n) => n.startsWith(numberPrefix))
    .map((n) => Number.parseInt(n.slice(numberPrefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${numberPrefix}${String(maxSeq + 1).padStart(5, '0')}`;
}

// ────────── store ──────────

export const useRFQStore = create<RFQStoreState>((set, get) => ({
  rfqs: INITIAL_MOCK_RFQS,
  qts: [],
  customerOrders: [],

  createRFQ: ({ customer, part, quantity, createdBy = '王小明' }) => {
    const existing = get().rfqs.map((r) => r.rfqNumber);
    const rfq: RFQ = {
      id: generateId('rfq'),
      rfqNumber: generateDocNumber('RFQ', existing),
      sourceCustomer: customer,
      part,
      quantity,
      vendorQuotes: [],
      status: 'waiting',
      createdAt: new Date(),
      createdBy,
    };
    set((state) => ({ rfqs: [rfq, ...state.rfqs] }));
    return rfq;
  },

  createCustomerOrder: ({ customer, part, quantity, createdBy = '王小明' }) => {
    const existing = get().customerOrders.map((o) => o.orderNumber);
    const order: CustomerOrder = {
      id: generateId('co'),
      orderNumber: generateDocNumber('CO', existing),
      customer,
      part,
      quantity,
      status: 'waiting',
      createdAt: new Date(),
      createdBy,
    };
    set((state) => ({ customerOrders: [order, ...state.customerOrders] }));
    return order;
  },

  addVendorQuote: (rfqId, input) => {
    const quote: VendorQuote = {
      id: generateId('vq'),
      quotedAt: new Date(),
      ...input,
    };
    set((state) => ({
      rfqs: state.rfqs.map((r) =>
        r.id === rfqId
          ? {
              ...r,
              vendorQuotes: [...r.vendorQuotes, quote],
              status: 'responded' as const,
            }
          : r,
      ),
    }));
  },

  removeVendorQuote: (rfqId, quoteId) => {
    set((state) => ({
      rfqs: state.rfqs.map((r) => {
        if (r.id !== rfqId) return r;
        const remaining = r.vendorQuotes.filter((q) => q.id !== quoteId);
        return {
          ...r,
          vendorQuotes: remaining,
          // 如果拿掉最後一筆，退回 waiting
          status: remaining.length === 0 ? 'waiting' : r.status,
        };
      }),
    }));
  },

  adoptVendorQuote: (rfqId, vendorQuoteId, finalPrice) => {
    const rfq = get().rfqs.find((r) => r.id === rfqId);
    if (!rfq) throw new Error(`RFQ ${rfqId} not found`);
    const vendor = rfq.vendorQuotes.find((v) => v.id === vendorQuoteId);
    if (!vendor) throw new Error(`Vendor quote ${vendorQuoteId} not found`);

    const tierMargin = TIER_TARGET_MARGIN[rfq.sourceCustomer.tier];
    const suggestedPrice = Math.round(vendor.price * (1 + tierMargin / 100));

    const existing = get().qts.map((q) => q.qtNumber);
    const qt: QT = {
      id: generateId('qt'),
      qtNumber: generateDocNumber('QT', existing),
      customer: rfq.sourceCustomer,
      part: rfq.part,
      quantity: rfq.quantity,
      vendorCost: vendor.price,
      suggestedPrice,
      finalPrice,
      source: 'inquiry',
      sourceRFQNumber: rfq.rfqNumber,
      status: 'pending_customer',
      createdAt: new Date(),
    };

    set((state) => ({
      rfqs: state.rfqs.map((r) =>
        r.id === rfqId
          ? {
              ...r,
              status: 'adopted' as const,
              adoptedVendorId: vendorQuoteId,
              relatedQtNumber: qt.qtNumber,
            }
          : r,
      ),
      qts: [qt, ...state.qts],
    }));

    return qt;
  },

  abandonRFQ: (rfqId) => {
    set((state) => ({
      rfqs: state.rfqs.map((r) =>
        r.id === rfqId ? { ...r, status: 'abandoned' as const } : r,
      ),
    }));
  },

  createDirectQTs: ({ customer, items }) => {
    const existing = get().qts.map((q) => q.qtNumber);
    const tierMargin = TIER_TARGET_MARGIN[customer.tier];
    // 一批 QT 使用連續流水號
    const generated: QT[] = [];
    items.forEach((item, index) => {
      const qtNumber = generateDocNumber(
        'QT',
        existing.concat(generated.map((g) => g.qtNumber)),
      );
      const suggested = Math.round(item.cost * (1 + tierMargin / 100));
      generated.push({
        id: generateId('qt'),
        qtNumber,
        customer,
        part: { sku: item.sku, name: item.name },
        quantity: item.quantity,
        vendorCost: item.cost,
        suggestedPrice: suggested,
        finalPrice: item.finalPrice,
        source: 'direct',
        status: 'pending_customer',
        createdAt: new Date(Date.now() + index),
      });
    });
    set((state) => ({ qts: [...generated, ...state.qts] }));
    return generated;
  },
}));
