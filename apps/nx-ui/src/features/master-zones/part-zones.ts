// apps/nx-ui/src/features/master-zones/part-zones.ts
// v1.2 對齊軌 階段 E P1：part 分區定義
//
// 對齊 intent v1.1 §2.4 + §3.2：
// - 4 zone：basic / sales / purchase / inventory
// - 決策 3.2（v1.1）：成本保密「不」在 service 層過濾、靠兩道屏障：
//   屏障 1：模組權限（進貨成本只放進貨頁、售價只放銷售頁）
//   屏障 2：主檔中心存取權限（客戶自訂哪個角色可進主檔中心）
// - 售價 ABCD + 價格更新人/時間：銷貨區（採購頁不放）
// - 進貨成本：採購區（銷售頁不放）
// - 主檔中心：顯示全部 zones（誰能進主檔中心由 OWNER 自訂角色控制）

import type { FieldDef, ZoneDef } from './types';

export type PartZone = 'basic' | 'sales' | 'purchase' | 'inventory';

export const PART_ZONES: ZoneDef<PartZone>[] = [
  { zone: 'basic', label: '基本資料', description: '料號 / 品名 / 品牌 / 規格 / 關聯資訊' },
  { zone: 'sales', label: '銷貨', description: '售價 ABCD 四級 / 價格更新人 / 時間' },
  { zone: 'purchase', label: '採購', description: '進貨成本' },
  { zone: 'inventory', label: '庫存', description: '退貨政策 / 保固月數 / 安全量 / 最高量 / 預設庫位' },
];

export const PART_FIELDS: FieldDef<PartZone>[] = [
  // ─── basic 基本資料區 ───
  // W5 [3-7] Crown 拍板四層編碼：①內碼=part.id ②舊料號 ③零件料號（必填、新增留空帶入舊料號、建立後鎖）④副廠料號
  // 編碼規則引擎屬汽車資料庫套件、LITE 不在範圍（codeRuleId optional）
  { key: 'code', label: '零件料號（顯示主碼）', zone: 'basic', notes: '必填顯示主碼；新增時可留空、系統自動帶入「舊料號」；建立後鎖定不可改' },
  { key: 'name', label: '品名', zone: 'basic', required: true },
  // 02 第四批 軌 3a 2026-06-07：編碼規則屬汽車資料庫套件、LITE 隱藏（資料結構保留、可留空）
  { key: 'codeRuleId', label: '編碼規則', zone: 'basic', minPlan: 'PLUS', notes: '汽車資料庫套件、LITE 隱藏；可留空' },
  { key: 'isOem', label: '正廠件', zone: 'basic' },
  { key: 'secCode', label: '副廠料號', zone: 'basic', notes: '可空、廠牌對照用' },
  { key: 'oldCode', label: '舊料號', zone: 'basic', notes: '舊系統料號、新增時 service 端會 fallback 進「零件料號」' },
  // 02 第四批 軌 3a 2026-06-07：seg1~5 屬汽車資料庫套件、LITE 隱藏（資料結構保留）
  { key: 'seg1', label: '料號段 1', zone: 'basic', minPlan: 'PLUS' },
  { key: 'seg2', label: '料號段 2', zone: 'basic', minPlan: 'PLUS' },
  { key: 'seg3', label: '料號段 3', zone: 'basic', minPlan: 'PLUS' },
  { key: 'seg4', label: '料號段 4', zone: 'basic', minPlan: 'PLUS' },
  { key: 'seg5', label: '料號段 5', zone: 'basic', minPlan: 'PLUS' },
  { key: 'partBrandId', label: '零件品牌', zone: 'basic' },
  { key: 'partGroupId', label: '零件族群', zone: 'basic' },
  { key: 'type', label: '零件類型', zone: 'basic', notes: '1 專用 / 2 通用 / 3 組合 / 4 拆解' },
  { key: 'countryId', label: '產地', zone: 'basic' },
  { key: 'spec', label: '規格 / 備註', zone: 'basic' },
  { key: 'uom', label: '單位', zone: 'basic', required: true, notes: 'LITE 固定 pcs' },
  // 基本資料區的衛星表（4 個關聯子表、決策 3.3 用分頁籤）
  {
    key: 'oemCodes',
    label: '正廠料號對應',
    zone: 'basic',
    isSatellite: true,
    satelliteName: 'nx01_part_oem_code',
    notes: '多對多、找替代品用',
  },
  {
    key: 'relations',
    label: '改號關聯',
    zone: 'basic',
    isSatellite: true,
    satelliteName: 'nx01_part_relation',
    notes: '新舊型號互通',
  },
  // 02 第四批 軌 3a 2026-06-07：車型適配屬汽車資料庫套件、LITE 隱藏（資料結構保留）
  {
    key: 'models',
    label: '車型適配',
    zone: 'basic',
    minPlan: 'PLUS',
    isSatellite: true,
    satelliteName: 'nx01_part_model',
    notes: '汽車資料庫套件、通用零件適用車型',
  },
  // 02 第四批 軌 3a B 拍板 2026-06-07：versions 為系統自動寫入的「規格變更歷史快照」，
  // 屬庫存稽核核心（被 NX02/NX03 退貨/驗收/期初/盤點/報廢/轉換/不良品 7 支業務 FK 綁），
  // 而非汽車資料庫套件。從零件主檔 UI 拉掉、不在此渲染；schema + read-only API 保留，
  // 後續軌在報表模組 NX08 做「料件異動歷史」報表給人查。
  // 退貨/盤點/保固照常使用快照、資料完整保留。

  // ─── sales 銷貨區（決策 3.2 屏障 1：只放銷售模組頁）───
  { key: 'priceA', label: 'A 級售價', zone: 'sales' },
  { key: 'priceB', label: 'B 級售價', zone: 'sales' },
  { key: 'priceC', label: 'C 級售價', zone: 'sales' },
  { key: 'priceD', label: 'D 級售價', zone: 'sales' },
  { key: 'priceUpdatedAt', label: '售價更新時間', zone: 'sales' },
  { key: 'priceUpdatedBy', label: '售價更新人', zone: 'sales' },
  // 02 第四批 軌 3b 2026-06-07：最後銷售時間（出貨過帳自動寫、唯讀、業績指標）
  { key: 'lastSaleAt', label: '最後銷售時間', zone: 'sales', notes: '出貨過帳自動寫、唯讀（取單據業務日 outboundDate、max）' },

  // ─── purchase 採購區（決策 3.2 屏障 1：只放進貨模組頁）───
  { key: 'cost', label: '進貨成本', zone: 'purchase', notes: '業務員填、價格重算基準' },
  // 02 第四批 軌 3b 2026-06-07：最後進貨時間（驗收入庫過帳自動寫、唯讀、業績指標）
  { key: 'lastPurchaseAt', label: '最後進貨時間', zone: 'purchase', notes: '驗收入庫過帳自動寫、唯讀（取單據業務日 inboundDate、max）' },

  // ─── inventory 庫存區 ───
  { key: 'returnPolicy', label: '退貨政策', zone: 'inventory', required: true, notes: 'F/S/R/N/W、影響貼紙' },
  { key: 'warrantyMonths', label: '保固月數', zone: 'inventory', required: true, notes: '0 = 不保固' },
  {
    key: 'stockSettings',
    label: '安全量 / 最高量 / 預設庫位（per 倉）',
    zone: 'inventory',
    isSatellite: true,
    satelliteName: 'nx03_part_stock_setting',
    notes: '每倉一筆',
  },
];
