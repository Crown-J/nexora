// apps/nx-ui/src/features/sale/ui/inquiry/types.ts
/**
 * R7 Phase 7 同行調貨（RFQ）+ 報價單（QT）+ 客戶訂單（CO）型別。
 *
 * 單據鏈（Crown 庫存哲學）：
 *   RFQ（詢價）→ QT（報價）→ TI（調貨，R9）→ SO（銷貨，R9）
 *   全程庫存 >= 0。
 *
 * Phase 7 範圍：RFQ + QT + CO。TI / SO 留給 R9。
 */

export type CustomerTier = 'A' | 'B' | 'C' | 'D';

export interface PartRef {
  sku: string;
  name: string;
}

export interface CustomerRef {
  code: string;
  name: string;
  tier: CustomerTier;
}

// 各客戶等級的目標毛利率（%）
// 採用對話框建議售價：vendorCost × (1 + margin/100)
export const TIER_TARGET_MARGIN: Record<CustomerTier, number> = {
  A: 22,
  B: 27,
  C: 32,
  D: 38,
};

// ───────────────────── 同行報價（單筆輸入） ─────────────────────

export interface VendorQuote {
  id: string;
  /** 供應商編號，例：V001 */
  vendorCode: string;
  vendorName: string;
  /** 同行給的單價 */
  price: number;
  quotedAt: Date;
  /** 備註，如「3 天內可到」「需先付款」 */
  notes?: string;
}

// ───────────────────── RFQ 詢價單 ─────────────────────

export type RFQStatus =
  | 'waiting' // 等待同行回報
  | 'responded' // 已有同行報價，等待業務採用
  | 'adopted' // 已採用某家同行（生成 QT）
  | 'abandoned'; // 業務放棄（全部不採用，結案）

export interface RFQ {
  id: string;
  /** RFQ-YYMM-xxxxx */
  rfqNumber: string;
  sourceCustomer: CustomerRef;
  part: PartRef;
  quantity: number;
  vendorQuotes: VendorQuote[];
  status: RFQStatus;
  /** 採用後記錄 */
  adoptedVendorId?: string;
  relatedQtNumber?: string;
  createdAt: Date;
  createdBy: string;
}

// ───────────────────── QT 報價單 ─────────────────────

export type QTSource = 'inquiry' | 'direct';

export type QTStatus = 'pending_customer' | 'accepted' | 'rejected' | 'expired';

export interface QT {
  id: string;
  /** QT-YYMM-xxxxx */
  qtNumber: string;
  customer: CustomerRef;
  part: PartRef;
  quantity: number;
  /** 採用的同行成本 */
  vendorCost: number;
  /** 系統建議售價（建議 = cost × (1+margin)） */
  suggestedPrice: number;
  /** 業務最終決定售價（可偏離建議） */
  finalPrice: number;
  source: QTSource;
  sourceRFQNumber?: string;
  status: QTStatus;
  createdAt: Date;
}

// ───────────────────── CO 客戶訂單（預訂單） ─────────────────────

export type COStatus = 'waiting' | 'fulfilled' | 'cancelled';

export interface CustomerOrder {
  id: string;
  /** CO-YYMM-xxxxx */
  orderNumber: string;
  customer: CustomerRef;
  part: PartRef;
  quantity: number;
  status: COStatus;
  createdAt: Date;
  createdBy: string;
}
