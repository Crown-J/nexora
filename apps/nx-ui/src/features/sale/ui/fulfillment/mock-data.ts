// apps/nx-ui/src/features/sale/ui/fulfillment/mock-data.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 5~7:履約 store 初始 demo 資料。
 *
 * 提供 4 筆既有銷貨單 + 1 筆 IT + 1 筆 TI,涵蓋 4 種備貨情境的展示樣本。
 * 含「等調撥 / 等同行 / 待出貨 / 配送中」等不同狀態,讓銷售中心狀態追蹤
 * 以及未來庫存中心(Phase 8+)接 store 時不需要再造一份 mock。
 *
 * sharedSeqStart 設為 60,代表 4 月已開過 60 張,新建從 61 開始。
 */

import type { CustomerRef } from '../inquiry/types';
import { PART_BY_SKU } from '../sop-workspace/mock-data/parts';
import { buildSharedDocNumbers, formatDocNumber, getCurrentYYMM } from './numbering';
import type { BX, DN, IT, PK, SO, SOItem, TI } from './types';

const yymm = getCurrentYYMM();

const CUSTOMERS: Record<string, CustomerRef> = {
  B0213: { code: 'B0213', name: '台北保養廠', tier: 'B' },
  A0087: { code: 'A0087', name: '新竹汽材行', tier: 'A' },
  D0542: { code: 'D0542', name: '桃園合興汽車', tier: 'D' },
  B0156: { code: 'B0156', name: '台中順達汽車', tier: 'B' },
};

function makeStockItem(sku: string, quantity: number, unitPrice: number): SOItem {
  const part = PART_BY_SKU[sku];
  return {
    sku,
    name: part?.name ?? sku,
    quantity,
    unitPrice,
    unitCost: part?.unitCost ?? 0,
    source: 'stock',
  };
}

function totalOf(items: readonly SOItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

const dayMs = 24 * 60 * 60 * 1000;

// SO #54 — 情境 A:本倉有貨,撿貨已建立、等待倉管處理
const so54Items = [
  makeStockItem('SKU-001', 2, 550),
  makeStockItem('SKU-022', 4, 100),
];
const so54Numbers = buildSharedDocNumbers(yymm, 54);
const SO_54: SO = {
  id: 'so-mock-54',
  soNumber: so54Numbers.soNumber,
  seq: 54,
  customer: CUSTOMERS.B0213,
  items: so54Items,
  scenario: 'A',
  status: 'ready_to_pick',
  relatedItNumbers: [],
  relatedTiNumbers: [],
  relatedPkNumber: so54Numbers.pkNumber,
  totalAmount: totalOf(so54Items),
  createdAt: new Date(Date.now() - dayMs),
  createdBy: '王小明',
};
const PK_54: PK = {
  id: 'pk-mock-54',
  pkNumber: so54Numbers.pkNumber,
  seq: 54,
  relatedSoNumber: so54Numbers.soNumber,
  items: so54Items,
  status: 'pending',
  createdAt: new Date(Date.now() - dayMs),
};

// SO #56 — 情境 A:本倉有貨,撿貨完成、待出貨
const so56Items = [
  makeStockItem('SKU-040', 1, 1150),
  makeStockItem('SKU-041', 2, 1400),
];
const so56Numbers = buildSharedDocNumbers(yymm, 56);
const SO_56: SO = {
  id: 'so-mock-56',
  soNumber: so56Numbers.soNumber,
  seq: 56,
  customer: CUSTOMERS.A0087,
  items: so56Items,
  scenario: 'A',
  status: 'packed',
  relatedItNumbers: [],
  relatedTiNumbers: [],
  relatedPkNumber: so56Numbers.pkNumber,
  relatedBxNumber: so56Numbers.bxNumber,
  totalAmount: totalOf(so56Items),
  createdAt: new Date(Date.now() - dayMs),
  createdBy: '王小明',
};
const PK_56: PK = {
  id: 'pk-mock-56',
  pkNumber: so56Numbers.pkNumber,
  seq: 56,
  relatedSoNumber: so56Numbers.soNumber,
  items: so56Items,
  status: 'completed',
  createdAt: new Date(Date.now() - dayMs),
  completedAt: new Date(Date.now() - dayMs / 2),
};
const BX_56: BX = {
  id: 'bx-mock-56',
  bxNumber: so56Numbers.bxNumber,
  seq: 56,
  relatedSoNumber: so56Numbers.soNumber,
  relatedPkNumber: so56Numbers.pkNumber,
  status: 'completed',
  createdAt: new Date(Date.now() - dayMs / 2),
  completedAt: new Date(Date.now() - dayMs / 4),
};

// SO #49 — 情境 B:等調撥完成
const so49Items = [makeStockItem('SKU-021', 2, 240)];
const so49Numbers = buildSharedDocNumbers(yymm, 49);
const IT_12: IT = {
  id: 'it-mock-12',
  itNumber: formatDocNumber('IT', yymm, 12),
  toWarehouse: 'main',
  items: [
    {
      sku: 'SKU-021',
      name: PART_BY_SKU['SKU-021']?.name ?? 'SKU-021',
      fromWarehouse: 'hsinchu',
      quantity: 2,
    },
  ],
  relatedSoNumber: so49Numbers.soNumber,
  status: 'in_transit',
  createdAt: new Date(Date.now() - 3 * dayMs),
  startedAt: new Date(Date.now() - dayMs),
};
const SO_49: SO = {
  id: 'so-mock-49',
  soNumber: so49Numbers.soNumber,
  seq: 49,
  customer: CUSTOMERS.D0542,
  items: so49Items,
  scenario: 'B',
  status: 'waiting_transfer',
  relatedItNumbers: [IT_12.itNumber],
  relatedTiNumbers: [],
  totalAmount: totalOf(so49Items),
  createdAt: new Date(Date.now() - 3 * dayMs),
  createdBy: '王小明',
};

// SO #38 — 情境 A:配送中(等簽收)
const so38Items = [makeStockItem('SKU-061', 1, 1280)];
const so38Numbers = buildSharedDocNumbers(yymm, 38);
const SO_38: SO = {
  id: 'so-mock-38',
  soNumber: so38Numbers.soNumber,
  seq: 38,
  customer: CUSTOMERS.B0156,
  items: so38Items,
  scenario: 'A',
  status: 'delivering',
  relatedItNumbers: [],
  relatedTiNumbers: [],
  relatedPkNumber: so38Numbers.pkNumber,
  relatedBxNumber: so38Numbers.bxNumber,
  relatedDnNumber: so38Numbers.dnNumber,
  totalAmount: totalOf(so38Items),
  createdAt: new Date(Date.now() - dayMs),
  createdBy: '王小明',
};
const PK_38: PK = {
  id: 'pk-mock-38',
  pkNumber: so38Numbers.pkNumber,
  seq: 38,
  relatedSoNumber: so38Numbers.soNumber,
  items: so38Items,
  status: 'completed',
  createdAt: new Date(Date.now() - dayMs),
  completedAt: new Date(Date.now() - dayMs / 2),
};
const BX_38: BX = {
  id: 'bx-mock-38',
  bxNumber: so38Numbers.bxNumber,
  seq: 38,
  relatedSoNumber: so38Numbers.soNumber,
  relatedPkNumber: so38Numbers.pkNumber,
  status: 'completed',
  createdAt: new Date(Date.now() - dayMs / 2),
  completedAt: new Date(Date.now() - dayMs / 3),
};
const DN_38: DN = {
  id: 'dn-mock-38',
  dnNumber: so38Numbers.dnNumber,
  seq: 38,
  relatedSoNumber: so38Numbers.soNumber,
  relatedBxNumber: so38Numbers.bxNumber,
  status: 'delivering',
  createdAt: new Date(Date.now() - dayMs / 3),
};

// TI 案例:同行調貨等待取回
const TI_05: TI = {
  id: 'ti-mock-05',
  tiNumber: formatDocNumber('TI', yymm, 5),
  items: [
    {
      sku: 'SKU-031',
      name: PART_BY_SKU['SKU-031']?.name ?? 'SKU-031',
      quantity: 3,
      vendorId: 'V005',
      vendorName: '桃園汽材',
      unitCost: 220,
    },
  ],
  relatedSoNumber: so49Numbers.soNumber,
  status: 'pending_pickup',
  createdAt: new Date(Date.now() - dayMs),
};

export const INITIAL_MOCK_SOS: readonly SO[] = [SO_54, SO_56, SO_49, SO_38];
export const INITIAL_MOCK_ITS: readonly IT[] = [IT_12];
export const INITIAL_MOCK_TIS: readonly TI[] = [TI_05];
export const INITIAL_MOCK_PKS: readonly PK[] = [PK_54, PK_56, PK_38];
export const INITIAL_MOCK_BXS: readonly BX[] = [BX_56, BX_38];
export const INITIAL_MOCK_DNS: readonly DN[] = [DN_38];

/** 共用流水號起點(SO/PK/BX/DN);新建 SO 從此 +1 */
export const SHARED_SEQ_START = 60;
/** IT 流水號起點 */
export const IT_SEQ_START = 12;
/** TI 流水號起點 */
export const TI_SEQ_START = 5;
