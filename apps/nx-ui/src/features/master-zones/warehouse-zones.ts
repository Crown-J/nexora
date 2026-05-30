// apps/nx-ui/src/features/master-zones/warehouse-zones.ts
// v1.2 對齊軌 階段 E P1：warehouse 分區定義
//
// 對齊 intent v1.1 §2.2：
// - warehouse 是中性主檔、無銷貨 / 財務區
// - 3 zone：basic / inventory（庫位子表）/ delivery（地址別名）
//
// ⚠️ delivery zone 的「地址」就是 basic zone 的結構化地址同一份資料、
//    視角不同：basic 看「倉庫在哪裡」、delivery 看「司機送貨怎麼到」
//    UI 可選擇 zone='delivery' 時只 render 跟送貨相關的欄位（含地圖連結、聯絡電話等）

import type { FieldDef, ZoneDef } from './types';

export type WarehouseZone = 'basic' | 'inventory' | 'delivery';

export const WAREHOUSE_ZONES: ZoneDef<WarehouseZone>[] = [
  { zone: 'basic', label: '基本資料', description: '倉庫基本資訊 / 主管 / 地址' },
  { zone: 'inventory', label: '庫存', description: '庫位管理（子層 CRUD、§7.3）' },
  { zone: 'delivery', label: '配送（地址視角）', description: '司機送貨需要的地址資訊' },
];

export const WAREHOUSE_FIELDS: FieldDef<WarehouseZone>[] = [
  // ─── basic 基本資料區 ───
  { key: 'code', label: '倉庫代碼', zone: 'basic', required: true, notes: 'unique per tenant' },
  { key: 'name', label: '倉庫名稱', zone: 'basic', required: true },
  { key: 'siteId', label: '所屬據點', zone: 'basic', required: true },
  { key: 'isMain', label: '是否主倉', zone: 'basic', required: true, notes: 'partial unique 一筆 true' },
  { key: 'warehouseTypeId', label: '倉庫類型', zone: 'basic', notes: 'PLUS：H/M/W/S、控制自動調撥' },
  { key: 'managerUserId', label: '倉管主管', zone: 'basic', notes: '離職 SET NULL' },
  { key: 'remark', label: '備註', zone: 'basic' },
  // 結構化地址（basic 看「倉庫在哪」、delivery 看「司機送貨怎麼到」）
  { key: 'cityId', label: '縣市', zone: 'basic' },
  { key: 'districtId', label: '鄉鎮市區', zone: 'basic' },
  { key: 'streetId', label: '路街', zone: 'basic' },
  { key: 'lane', label: '巷', zone: 'basic' },
  { key: 'alley', label: '弄', zone: 'basic' },
  { key: 'buildingNo', label: '號', zone: 'basic' },
  { key: 'buildingSubNo', label: '號子號', zone: 'basic' },
  { key: 'floor', label: '樓層', zone: 'basic' },
  { key: 'roomNo', label: '室號', zone: 'basic' },

  // ─── inventory 庫存區 ───
  {
    key: 'locations',
    label: '庫位（樹狀分區）',
    zone: 'inventory',
    isSatellite: true,
    satelliteName: 'nx01_location',
    notes: 'CRUD、區/架/層/格階層',
  },
];

/// delivery zone 的 view：跟 basic 共用地址欄位
/// UI 渲染 delivery zone 時、可以從 PARTNER_FIELDS 動態抽地址相關 keys
export const DELIVERY_VIEW_FIELD_KEYS = [
  'name', // 倉庫名稱（給司機看「送到哪個倉」）
  'cityId',
  'districtId',
  'streetId',
  'lane',
  'alley',
  'buildingNo',
  'buildingSubNo',
  'floor',
  'roomNo',
  'managerUserId', // 倉管主管（給司機聯絡用）
];
