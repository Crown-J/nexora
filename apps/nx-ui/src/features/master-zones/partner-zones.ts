// apps/nx-ui/src/features/master-zones/partner-zones.ts
// v1.2 對齊軌 階段 E P1：partner 分區定義
//
// 對齊 intent v1.1 §2.1 + §3.1：
// - 4 zone：basic / sales / delivery / finance
// - 決策 3.1：partner 編輯頁依「身分類別」(partnerType) 動態顯示分區
//   · C 保養廠、O 同行 → 4 zone 全顯
//   · S 供應商 → basic + delivery + finance
//   · B 銀行 → basic + finance
//   · T 物流 → basic + delivery
//   · V 一般廠商 → basic + finance
// - 主檔中心不受身分限制、顯示全部 zone

import type { FieldDef, ZoneDef } from './types';

export type PartnerZone = 'basic' | 'sales' | 'delivery' | 'finance';

export const PARTNER_ZONES: ZoneDef<PartnerZone>[] = [
  { zone: 'basic', label: '基本資料', description: '公司基本資訊、聯絡方式、身分類別' },
  { zone: 'sales', label: '銷貨', description: '客戶等級 / 信用 / 預設取貨倉 / 業務歸屬' },
  { zone: 'delivery', label: '配送', description: '送貨地址（可多筆）' },
  { zone: 'finance', label: '財務', description: '統編 / 付款條件 / 幣別 / 帳單地址 / 供應商等級' },
];

export const PARTNER_FIELDS: FieldDef<PartnerZone>[] = [
  // ─── basic 基本資料區 ───
  { key: 'code', label: '公司代碼', zone: 'basic', required: true, notes: 'unique per tenant' },
  { key: 'name', label: '公司名稱', zone: 'basic', required: true },
  { key: 'shortName', label: '公司簡稱', zone: 'basic' },
  { key: 'nameEn', label: '英文名稱', zone: 'basic' },
  { key: 'partnerType', label: '身分類別', zone: 'basic', required: true, notes: 'C/O/S/T/B/V 六分類' },
  { key: 'remark', label: '備註', zone: 'basic' },
  { key: 'serviceLocation', label: '服務區域', zone: 'basic', notes: '業務分區 / 區域代碼' },
  { key: 'contactName', label: '聯絡人', zone: 'basic' },
  { key: 'phone', label: '電話', zone: 'basic' },
  { key: 'mobile', label: '手機', zone: 'basic' },
  { key: 'fax', label: '傳真', zone: 'basic' },
  { key: 'email', label: 'Email', zone: 'basic' },
  { key: 'website', label: '官網', zone: 'basic' },
  { key: 'address', label: '地址（自由文字）', zone: 'basic', notes: '結構化地址在 delivery / finance 衛星表' },

  // ─── sales 銷貨區 ───
  { key: 'customerGradeId', label: '客戶等級', zone: 'sales', notes: 'C / O 用、影響 ABCD 定價' },
  { key: 'creditLimit', label: '信用額度', zone: 'sales', notes: '0 = 不限制' },
  { key: 'creditStatus', label: '信用狀態', zone: 'sales', notes: 'N=正常 / W=僅收現金 / F=凍結' },
  { key: 'defaultWarehouseId', label: '預設取貨倉', zone: 'sales' },
  { key: 'canTransferStock', label: '可同行調貨', zone: 'sales', notes: 'O 預設 true、C 可手動開' },
  { key: 'salesUserId', label: '業務歸屬', zone: 'sales' },

  // ─── delivery 配送區 ───
  {
    key: 'shippingAddresses',
    label: '送貨地址（多筆）',
    zone: 'delivery',
    isSatellite: true,
    satelliteName: 'nx01_partner_shipping_address',
    notes: '一對多、決策 3.3「預設 + 展開看全部」',
  },

  // ─── finance 財務區 ───
  { key: 'taxId', label: '統一編號', zone: 'finance' },
  { key: 'paymentTermDomestic', label: '國內付款條件', zone: 'finance', required: true, notes: 'PREPAY / NET30 / NET60 / NET90' },
  { key: 'paymentTermImport', label: '國外付款條件', zone: 'finance', notes: 'TT / LC / DP / DA' },
  { key: 'incoterm', label: '貿易條件', zone: 'finance', notes: 'FOB / CIF / EXW / DDP' },
  { key: 'defaultCurrencyId', label: '預設幣別', zone: 'finance' },
  { key: 'supplierGradeId', label: '供應商等級', zone: 'finance', notes: 'S 純供應商用' },
  {
    key: 'billingAddress',
    label: '帳單地址',
    zone: 'finance',
    isSatellite: true,
    satelliteName: 'nx01_partner_billing_address',
    notes: '一對一',
  },
];

/// 決策 3.1：依 partnerType 決定模組頁可見的 zones
/// 主檔中心不適用本函數、永遠顯示全部 zones
export function visibleZonesByPartnerType(partnerType: string | null | undefined): Set<PartnerZone> {
  const t = String(partnerType ?? '').toUpperCase();
  switch (t) {
    case 'C': // 保養廠
    case 'O': // 同行
      return new Set(['basic', 'sales', 'delivery', 'finance']);
    case 'S': // 供應商
      return new Set(['basic', 'delivery', 'finance']);
    case 'B': // 銀行
      return new Set(['basic', 'finance']);
    case 'T': // 物流
      return new Set(['basic', 'delivery']);
    case 'V': // 一般廠商
      return new Set(['basic', 'finance']);
    default:
      // 未知 / 未填、保守只顯示基本資料
      return new Set(['basic']);
  }
}
