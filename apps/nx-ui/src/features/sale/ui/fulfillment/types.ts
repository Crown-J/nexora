// apps/nx-ui/src/features/sale/ui/fulfillment/types.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 5~7:履約階段型別。
 *
 * 涵蓋 SO 建立後的備貨 / 撿包送單據鏈:
 *   SO → [IT 調撥 / TI 調貨] → PK 撿貨 → BX 包貨 → DN 送貨
 *
 * 全程遵守 Crown 庫存哲學:庫存 >= 0。IT/TI 完成後才自動產生 PK。
 * SO / PK / BX / DN 共用同一流水號池(見 numbering.ts),方便一眼識別同一筆交易。
 * IT / TI 各自獨立流水。
 */

import type { CustomerRef } from '../inquiry/types';
import type { WarehouseKey } from '../sop-workspace/types';

export type { WarehouseKey };

/** 備貨情境代碼(SYS-C 分流) */
export type SupplyScenario = 'A' | 'B' | 'C' | 'D';

export type SOItemSource = 'stock' | 'inquiry';

export interface SOItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  /** stock=本公司庫存撿/調,inquiry=從 RFQ 採用下來需向同行調貨 */
  source: SOItemSource;
  adoptedVendorId?: string;
  adoptedVendorName?: string;
  sourceRfqNumber?: string;
  sourceQtNumber?: string;
}

export type SOStatus =
  | 'waiting_transfer'
  | 'waiting_supplier'
  | 'waiting_all'
  | 'ready_to_pick'
  | 'picking'
  | 'packed'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export interface SO {
  id: string;
  /** SO-YYMM-xxxxx */
  soNumber: string;
  /** 共用流水號(與 PK/BX/DN 相同) */
  seq: number;
  customer: CustomerRef;
  items: SOItem[];
  scenario: SupplyScenario;
  status: SOStatus;
  relatedItNumbers: string[];
  relatedTiNumbers: string[];
  relatedPkNumber?: string;
  relatedBxNumber?: string;
  relatedDnNumber?: string;
  totalAmount: number;
  createdAt: Date;
  createdBy: string;
}

// ───────────────────── IT 調撥單(他倉 → 本倉) ─────────────────────

export type ITStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface ITItem {
  sku: string;
  name: string;
  fromWarehouse: WarehouseKey;
  quantity: number;
}

export interface IT {
  id: string;
  /** IT-YYMM-xxxxx(獨立流水) */
  itNumber: string;
  /** 目標倉,一律本倉 */
  toWarehouse: WarehouseKey;
  items: ITItem[];
  relatedSoNumber: string;
  status: ITStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ───────────────────── TI 調貨單(同行 → 本倉) ─────────────────────

export type TIStatus = 'pending_pickup' | 'picked_up' | 'completed' | 'cancelled';

export interface TIItem {
  sku: string;
  name: string;
  quantity: number;
  vendorId: string;
  vendorName: string;
  unitCost: number;
  sourceRfqNumber?: string;
  sourceQtNumber?: string;
}

export interface TI {
  id: string;
  /** TI-YYMM-xxxxx(獨立流水) */
  tiNumber: string;
  items: TIItem[];
  relatedSoNumber: string;
  status: TIStatus;
  createdAt: Date;
  pickedUpAt?: Date;
  completedAt?: Date;
}

// ───────────────────── PK / BX / DN(與 SO 同 seq) ─────────────────────

export type PKStatus = 'pending' | 'picking' | 'completed';

export interface PK {
  id: string;
  pkNumber: string;
  seq: number;
  relatedSoNumber: string;
  items: SOItem[];
  status: PKStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type BXStatus = 'pending' | 'packing' | 'completed';

export interface BX {
  id: string;
  bxNumber: string;
  seq: number;
  relatedSoNumber: string;
  relatedPkNumber: string;
  status: BXStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type DNStatus = 'pending' | 'delivering' | 'signed' | 'cancelled';

export interface DN {
  id: string;
  dnNumber: string;
  seq: number;
  relatedSoNumber: string;
  relatedBxNumber: string;
  status: DNStatus;
  createdAt: Date;
  deliveredAt?: Date;
}

// ───────────────────── SYS-C 分析結果 ─────────────────────

export interface SupplyAnalysis {
  scenario: SupplyScenario;
  needsTransfer: boolean;
  needsInquiry: boolean;
  transferPlan: Array<{
    sku: string;
    name: string;
    fromWarehouse: WarehouseKey;
    quantity: number;
  }>;
  inquiryPlan: Array<{
    sku: string;
    name: string;
    quantity: number;
    vendorId?: string;
    vendorName?: string;
    unitCost?: number;
    sourceRfqNumber?: string;
    sourceQtNumber?: string;
  }>;
}

// ───────────────────── 狀態文字對照(中心共用) ─────────────────────

export const SO_STATUS_LABEL: Record<SOStatus, string> = {
  waiting_transfer: '等調撥完成',
  waiting_supplier: '等同行送貨',
  waiting_all: '等全部備齊',
  ready_to_pick: '待撿貨',
  picking: '撿貨中',
  packed: '待出貨',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
};

export const IT_STATUS_LABEL: Record<ITStatus, string> = {
  pending: '待調撥',
  in_transit: '調撥中',
  completed: '已完成',
  cancelled: '已取消',
};

export const TI_STATUS_LABEL: Record<TIStatus, string> = {
  pending_pickup: '等待取貨',
  picked_up: '已取回',
  completed: '已完成',
  cancelled: '已取消',
};

export const PK_STATUS_LABEL: Record<PKStatus, string> = {
  pending: '待撿貨',
  picking: '撿貨中',
  completed: '已完成',
};

export const BX_STATUS_LABEL: Record<BXStatus, string> = {
  pending: '待包貨',
  packing: '包貨中',
  completed: '已完成',
};

export const DN_STATUS_LABEL: Record<DNStatus, string> = {
  pending: '待出貨',
  delivering: '配送中',
  signed: '已簽收',
  cancelled: '已取消',
};

export const SCENARIO_LABEL: Record<SupplyScenario, string> = {
  A: '本倉有貨,直接備貨',
  B: '需他倉調撥',
  C: '需同行調貨',
  D: '需調撥 + 調貨(並行)',
};
