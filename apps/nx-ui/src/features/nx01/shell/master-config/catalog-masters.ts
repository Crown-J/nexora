// apps/nx-ui/src/features/base/master-config/catalog-masters.ts
/**
 * nx01/ 系列主檔的 EntityMasterConfig（鋼鐵星球範式、deleteMode='soft-delete-rest'）
 *
 * 對齊後端 `nx01/<複數>` REST + DELETE 軟刪除約定（盤點：所有 list 回 rows、停用走 @Delete soft）。
 * enum（SmallInt 碼）用 select、外鍵用 ref（從來源主檔載入下拉）。
 *
 * ⚠️ ref 下拉目前一次載入前 100 筆 active（fetchRefOptions pageSize=100）；
 *    零件 / 車型等資料量大者，未來應升級為搜尋式 picker。
 */

import type { EntityMasterConfig } from '@/features/nx01/shell/entity-master/config';

const SOFT = 'soft-delete-rest' as const;

// ── 帳號與權限 ──────────────────────────────────────────
export const ROLE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/roles',
  category: '帳號與權限',
  title: '職務基本資料',
  entityNoun: '職務',
  pageId: 'role',
  errorCodePrefix: 'nxui_base_role',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '職務代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[120px]' },
    { key: 'name', label: '職務名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'description', label: '說明', inList: false },
    // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
    { key: 'level', label: '層級', minWidthClass: 'min-w-[100px]' },
    { key: 'departmentId', label: '隸屬部門', type: 'ref', refBasePath: 'nx01/departments', minWidthClass: 'min-w-[140px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// 05 批 T1 2026-06-07：部門主檔揭露（後端 controller/service 第三批 T1 已補；UI 從 nx07 placeholder 升級成通用範式）
export const DEPARTMENT_MASTER: EntityMasterConfig = {
  basePath: 'nx01/departments',
  category: '帳號與權限',
  title: '部門基本資料',
  entityNoun: '部門',
  pageId: 'dept',
  errorCodePrefix: 'nxui_base_department',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '部門代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[120px]' },
    { key: 'name', label: '部門名稱', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// 05 批 T2 2026-06-07：組主檔揭露（後端 Nx01Team schema 既有：departmentId 必填 + 自我 ref 子組）
export const TEAM_MASTER: EntityMasterConfig = {
  basePath: 'nx01/teams',
  category: '帳號與權限',
  title: '組基本資料',
  entityNoun: '組',
  pageId: 'group',
  errorCodePrefix: 'nxui_base_team',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '組代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[120px]' },
    { key: 'name', label: '組名', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'departmentId', label: '隸屬部門', type: 'ref', refBasePath: 'nx01/departments', required: true, minWidthClass: 'min-w-[140px]' },
    // 上層組（選填、支援子組；服務端會驗「子組與上層組同部門」+「不可自己當自己父」）
    { key: 'parentTeamId', label: '上層組', type: 'ref', refBasePath: 'nx01/teams', minWidthClass: 'min-w-[140px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 車型字典 ────────────────────────────────────────────
export const CAR_BRAND_MASTER: EntityMasterConfig = {
  basePath: 'nx01/car-brands',
  category: '車型字典',
  title: '車廠品牌基本資料',
  entityNoun: '車廠品牌',
  errorCodePrefix: 'nxui_base_car_brand',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '品牌代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '品牌名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'countryId', label: '國別', type: 'ref', refBasePath: 'nx01/countries', minWidthClass: 'min-w-[120px]' },
    { key: 'logoUrl', label: 'Logo 網址', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const MODEL_MASTER: EntityMasterConfig = {
  basePath: 'nx01/models',
  category: '車型字典',
  title: '車型基本資料',
  entityNoun: '車型',
  errorCodePrefix: 'nxui_base_model',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '車型代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '車型名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isCar: 'true' }, required: true, minWidthClass: 'min-w-[120px]' },
    { key: 'modelYearFrom', label: '年式(起)', type: 'number', required: true },
    { key: 'modelYearTo', label: '年式(迄)', type: 'number', inList: false },
    // 2026-06-26：引擎等外鍵取消、改自由輸入
    { key: 'engineCode', label: '引擎代碼', inList: false },
    { key: 'displacementCc', label: '排氣量(cc)', type: 'number', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── W6 [3-8] 2026-06-06 品牌合併：新 Brand 主檔（合 PartBrand + CarBrand 雙開關） ────
export const BRAND_MASTER: EntityMasterConfig = {
  basePath: 'nx01/brands',
  category: '產品料號',
  title: '品牌基本資料',
  entityNoun: '品牌',
  pageId: 'brand',
  errorCodePrefix: 'nxui_base_brand',
  deleteMode: SOFT,
  fields: [
    // 02 第四批 軌 4 2026-06-07：品牌代碼固定 3 碼大寫英文（總經理拍板、業界縮寫範式）。
    // 老資料不動（建立後不可改、舊碼若 != 3 碼維持原樣）；只擋新增 / 編輯。
    { key: 'code', label: '品牌代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minLength: 3, maxLength: 3, placeholder: 'BMW', minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '品牌名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'countryId', label: '國別', type: 'ref', refBasePath: 'nx01/countries', minWidthClass: 'min-w-[120px]' },
    { key: 'isCar', label: '汽車品牌', type: 'toggle', defaultValue: false, minWidthClass: 'min-w-[90px]' },
    { key: 'isPart', label: '零件品牌', type: 'toggle', defaultValue: false, minWidthClass: 'min-w-[90px]' },
    { key: 'logoUrl', label: 'Logo 網址', inList: false },
    { key: 'remark', label: '備註', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 通用件群組 ─ 2026-06-20 主檔群組模板取代、PART_COMPAT_GROUP_MASTER 移除
// 改用 features/nx01/product/universal-group/UniversalGroupPage.tsx（主件範式）

// ── 客戶分類 / 02 對齊第二批 C 軌 CP1 ─────────────────────
export const REGION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/regions',
  category: '客戶分類',
  title: '地區基本資料',
  entityNoun: '地區',
  pageId: 'region',
  errorCodePrefix: 'nxui_base_region',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '地區代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '地區名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 產品料號 ────────────────────────────────────────────
/**
 * @deprecated 2026-06-18:已被 BRAND_MASTER 合併（nx01/brands + isPart=true）。
 * 保留 export 暫不刪、避免 part-brand/page.tsx 對應 page 編譯失敗。
 * pageId 移除（dock 不標亮）；page.tsx 應加 redirect 到 /dashboard/master/brand。
 */
export const PART_BRAND_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-brands',
  category: '產品料號',
  title: '零件廠牌基本資料',
  entityNoun: '零件廠牌',
  errorCodePrefix: 'nxui_base_part_brand',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '廠牌代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '廠牌名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'countryId', label: '國別', type: 'ref', refBasePath: 'nx01/countries', inList: false },
    { key: 'isOem', label: '是否原廠', type: 'toggle', defaultValue: false, inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const PART_RELATION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-relations',
  category: '產品料號',
  title: '零件關聯基本資料',
  entityNoun: '零件關聯',
  errorCodePrefix: 'nxui_base_part_relation',
  deleteMode: SOFT,
  minPlan: 'PLUS',
  // 2026-06-26：定位為「單向替代」（副廠一件替代多個不互通正廠）；
  //   全互換改用通用件群組、組合/拆解改用組件關係。
  fields: [
    { key: 'partIdFrom', label: '原件（被替代）', type: 'ref', refBasePath: 'nx01/parts', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'partIdTo', label: '替代品', type: 'ref', refBasePath: 'nx01/parts', required: true, minWidthClass: 'min-w-[160px]' },
    {
      key: 'relationType', label: '類型', type: 'select', numeric: true, required: true, defaultValue: '2', minWidthClass: 'min-w-[100px]',
      options: [{ value: 2, label: '替代（單向）' }],
    },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const PART_MODEL_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-models',
  category: '產品料號',
  title: '料件車型適配基本資料',
  entityNoun: '料件車型適配',
  errorCodePrefix: 'nxui_base_part_model',
  deleteMode: SOFT,
  minPlan: 'PLUS',
  fields: [
    { key: 'partId', label: '零件', type: 'ref', refBasePath: 'nx01/parts', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'modelId', label: '車型', type: 'ref', refBasePath: 'nx01/models', required: true, minWidthClass: 'min-w-[160px]' },
    {
      key: 'fitLevel', label: '適配等級', type: 'select', numeric: true, required: true, minWidthClass: 'min-w-[110px]',
      options: [{ value: 1, label: '原廠' }, { value: 2, label: '副廠等效' }, { value: 3, label: '通用' }],
    },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 組織架構 ────────────────────────────────────────────
export const WAREHOUSE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/warehouses',
  category: '組織架構',
  title: '倉庫基本資料',
  entityNoun: '倉庫',
  pageId: 'warehouse',
  errorCodePrefix: 'nxui_base_warehouse',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '倉庫代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '倉庫名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'siteId', label: '所屬據點', type: 'ref', refBasePath: 'nx01/sites', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'warehouseTypeId', label: '倉別', type: 'ref', refBasePath: 'nx01/warehouse-types', inList: false },
    { key: 'remark', label: '備註', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const WAREHOUSE_TYPE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/warehouse-types',
  category: '組織架構',
  title: '倉別基本資料',
  entityNoun: '倉別',
  errorCodePrefix: 'nxui_base_warehouse_type',
  readOnly: true,
  canCreate: false,
  fields: [
    { key: 'code', label: '倉別代碼', mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '倉別名稱', minWidthClass: 'min-w-[140px]' },
    { key: 'flowMode', label: '流向模式', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', inList: false },
  ],
};

// ── 交易對象 ────────────────────────────────────────────
export const CUSTOMER_GRADE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/customer-grades',
  category: '交易對象',
  title: '客戶分級基本資料',
  entityNoun: '客戶分級',
  pageId: 'custgrade',
  errorCodePrefix: 'nxui_base_customer_grade',
  deleteMode: 'update-active',
  canCreate: false,
  fields: [
    { key: 'code', label: '分級代碼', lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '分級名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'marginPct', label: '加成率(%)', minWidthClass: 'min-w-[100px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// 05 批 T4 2026-06-07：供應商分級半開放（可新增自訂等級、A/B/C/D 內建後端鎖刪）
//   後端守：partner.recalcSupplierGradeByPaymentTerm 依賴內建 A/B/C/D code、service softDelete 拋 403。
//   業務員操作：新增 VIP / 列管 等自訂等級可改可停用；按刪除內建會收到後端錯誤訊息（UX 友善）。
export const SUPPLIER_GRADE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/supplier-grades',
  category: '交易對象',
  title: '供應商分級基本資料',
  entityNoun: '供應商分級',
  pageId: 'suppgrade',
  errorCodePrefix: 'nxui_base_supplier_grade',
  deleteMode: 'soft-delete-rest',
  fields: [
    { key: 'code', label: '分級代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]', placeholder: 'VIP' },
    { key: 'name', label: '分級名稱', required: true, minWidthClass: 'min-w-[140px]', placeholder: '優質供應商' },
    { key: 'description', label: '說明', minWidthClass: 'min-w-[200px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const PARTNER_MASTER: EntityMasterConfig = {
  basePath: 'nx01/partners',
  category: '交易對象',
  title: '往來對象基本資料',
  entityNoun: '往來對象',
  errorCodePrefix: 'nxui_base_partner',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '對象代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[110px]' },
    { key: 'name', label: '對象名稱', required: true, minWidthClass: 'min-w-[160px]' },
    {
      key: 'partnerType', label: '對象類型', type: 'select', required: true, minWidthClass: 'min-w-[120px]',
      // partner 改制六分類（Crown 2026-05-28）：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
      options: [
        { value: 'C', label: '保養廠' },
        { value: 'O', label: '同行' },
        { value: 'S', label: '供應商' },
        { value: 'T', label: '外包物流' },
        { value: 'V', label: '一般廠商' },
        { value: 'B', label: '銀行' },
      ],
    },
    { key: 'contactName', label: '聯絡人', minWidthClass: 'min-w-[100px]' },
    { key: 'phone', label: '電話', minWidthClass: 'min-w-[110px]' },
    { key: 'mobile', label: '手機', inList: false },
    { key: 'email', label: 'Email', inList: false },
    { key: 'taxId', label: '統一編號', inList: false },
    { key: 'address', label: '地址', inList: false },
    { key: 'customerGradeId', label: '客戶分級', type: 'ref', refBasePath: 'nx01/customer-grades', inList: false },
    {
      key: 'creditStatus', label: '信用狀態', type: 'select', inList: false,
      options: [{ value: 'N', label: '正常' }, { value: 'W', label: '警示' }, { value: 'F', label: '凍結' }],
    },
    { key: 'creditLimit', label: '信用額度', type: 'number', inList: false },
    {
      key: 'paymentTermDomestic', label: '國內付款條件', type: 'select', inList: false,
      options: [
        { value: 'PREPAY', label: '預付' }, { value: 'NET30', label: '月結 30 天' },
        { value: 'NET60', label: '月結 60 天' }, { value: 'NET90', label: '月結 90 天' },
      ],
    },
    {
      key: 'paymentTermImport', label: '進口付款條件', type: 'select', inList: false,
      options: [
        { value: 'TT', label: 'TT 電匯' }, { value: 'LC', label: 'LC 信用狀' },
        { value: 'DP', label: 'DP 付款交單' }, { value: 'DA', label: 'DA 承兌交單' },
      ],
    },
    { key: 'incoterm', label: '貿易條件', inList: false },
    { key: 'remark', label: '備註', inList: false },
  ],
};

// ── 供應商供貨對應（T3 進貨對齊批次 2026-06-08）─────────────
// ── 供應商供貨對應 ─ 2026-06-20 主檔群組模板取代、PARTNER_PART_MASTER 移除
// 改用 features/nx01/partner/supplier-supply/SupplierSupplyPage.tsx（品牌 accordion 範式）
// 後端 API 保留 /nx02/partner-part（5 endpoint）、新頁可重接

// ── 系統設定 ────────────────────────────────────────────
export const PHONETIC_DICTIONARY_MASTER: EntityMasterConfig = {
  basePath: 'nx01/phonetic-dictionary',
  category: '系統設定',
  title: '注音字典基本資料',
  entityNoun: '注音字',
  pageId: 'zhuyin',
  errorCodePrefix: 'nxui_base_phonetic',
  deleteMode: SOFT,
  fields: [
    { key: 'character', label: '字', required: true, mono: true, minWidthClass: 'min-w-[80px]' },
    { key: 'primaryPhonetic', label: '主注音', required: true, minWidthClass: 'min-w-[120px]' },
    { key: 'primaryInitial', label: '主聲母', required: true, minWidthClass: 'min-w-[100px]' },
    { key: 'usageFreq', label: '使用頻率', type: 'number', inList: false },
  ],
};

// ── 組織架構（補後端後）──────────────────────────────────
// 據點（公司物理分點，倉庫之上一層；LITE 預設 1 筆「總公司」）
export const SITE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/sites',
  category: '組織架構',
  title: '據點基本資料',
  entityNoun: '據點',
  pageId: 'sitebase',
  errorCodePrefix: 'nxui_base_site',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '據點代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '據點名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'isMain', label: '設為主據點', type: 'toggle', defaultValue: false, minWidthClass: 'min-w-[90px]' },
    { key: 'address', label: '地址（舊版自由文字）', inList: false },
    // ⚠️ 結構化地址 city/district/street 欄位已在 schema 對齊倉庫範式（並存），但 NX01-04 地址端點 / picker 尚未接（倉庫亦同）、暫不於 UI 暴露
    { key: 'phone', label: '聯絡電話', minWidthClass: 'min-w-[120px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// 庫位（倉庫內的物理位置：區/架/層/格；屬於某倉庫 + 某據點）
export const LOCATION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/locations',
  category: '組織架構',
  title: '庫位基本資料',
  entityNoun: '庫位',
  pageId: 'bin',
  errorCodePrefix: 'nxui_base_location',
  deleteMode: SOFT,
  fields: [
    { key: 'siteId', label: '所屬據點', type: 'ref', refBasePath: 'nx01/sites', minWidthClass: 'min-w-[140px]' },
    { key: 'warehouseId', label: '所屬倉庫', type: 'ref', refBasePath: 'nx01/warehouses', required: true, minWidthClass: 'min-w-[140px]' },
    // 2026-06-22 執行長拍板：新四層架構 site→warehouse→zone→location、zoneId 主、舊 zone 字串保留相容
    { key: 'zoneId', label: '所屬分區', type: 'ref', refBasePath: 'nx01/warehouse-zones', minWidthClass: 'min-w-[140px]' },
    { key: 'code', label: '庫位代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[110px]' },
    { key: 'name', label: '名稱', minWidthClass: 'min-w-[120px]' },
    { key: 'zone', label: '區（舊欄、棄用）', inList: false },
    { key: 'rack', label: '架號', inList: false },
    { key: 'levelNo', label: '層', type: 'number', inList: false },
    { key: 'binNo', label: '格', inList: false },
    { key: 'remark', label: '備註', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 產品料號（複雜主檔）──────────────────────────────────
export const PART_MASTER: EntityMasterConfig = {
  basePath: 'nx01/parts',
  category: '產品料號',
  title: '零件基本資料',
  entityNoun: '零件',
  errorCodePrefix: 'nxui_base_part',
  deleteMode: SOFT,
  fields: [
    // 2026-06-26：基準料號開放修改（取消 lockedOnEdit）、純手動輸入
    { key: 'code', label: '基準料號', required: true, mono: true, minWidthClass: 'min-w-[140px]' },
    { key: 'name', label: '品名', required: true, minWidthClass: 'min-w-[160px]' },
    // 2026-06-26：廠牌料號必填
    { key: 'secCode', label: '廠牌料號', required: true, mono: true, minWidthClass: 'min-w-[140px]' },
    { key: 'partBrandId', label: '零件廠牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isPart: 'true' }, minWidthClass: 'min-w-[120px]' },
    { key: 'partGroupId', label: '零件族群（分類三）', type: 'ref', refBasePath: 'nx01/part-groups', inList: false },
    // 2026-06-26 分類一・採購角度（寫死）
    {
      key: 'purchaseCategory', label: '採購分類', type: 'select', numeric: true, inList: false,
      options: [{ value: 1, label: '保養件' }, { value: 2, label: '維修件' }, { value: 3, label: '事故件' }, { value: 4, label: '改裝件' }, { value: 5, label: '油品耗材' }],
    },
    // 2026-06-26 分類二・技術角度（寫死）
    {
      key: 'techCategory', label: '技術分類', type: 'select', numeric: true, inList: false,
      options: [
        { value: 1, label: '引擎／動力系統' }, { value: 2, label: '傳動系統' }, { value: 3, label: '制動系統' },
        { value: 4, label: '轉向系統' }, { value: 5, label: '懸吊與底盤系統' }, { value: 6, label: '電氣與電子系統' },
        { value: 7, label: '冷卻與空調系統' }, { value: 8, label: '車體外觀與內裝' }, { value: 9, label: '安全與輔助系統' },
      ],
    },
    { key: 'countryId', label: '產地', type: 'ref', refBasePath: 'nx01/countries', inList: false },
    {
      key: 'partType', label: '料件類型', type: 'select', numeric: true, inList: false,
      options: [{ value: 1, label: '專用件' }, { value: 2, label: '通用件' }, { value: 3, label: '組合件' }, { value: 4, label: '拆解件' }],
    },
    { key: 'isOem', label: '原廠件', type: 'toggle', inList: false },
    { key: 'spec', label: '規格', inList: false },
    { key: 'uom', label: '單位', inList: false },
    { key: 'warrantyMonths', label: '保固月數', type: 'number', inList: false },
    { key: 'priceA', label: '售價 A', type: 'number', inList: false },
    { key: 'priceB', label: '售價 B', type: 'number', inList: false },
    { key: 'priceC', label: '售價 C', type: 'number', inList: false },
    { key: 'priceD', label: '售價 D', type: 'number', inList: false },
  ],
};

// ── 公告 ────────────────────────────────────────────────
export const BULLETIN_MASTER: EntityMasterConfig = {
  basePath: 'nx01/bulletins',
  category: '系統設定',
  title: '公告基本資料',
  entityNoun: '公告',
  errorCodePrefix: 'nxui_base_bulletin',
  deleteMode: SOFT,
  fields: [
    { key: 'title', label: '標題', required: true, minWidthClass: 'min-w-[200px]' },
    { key: 'content', label: '內容', type: 'textarea', inList: false },
    {
      key: 'importance', label: '重要性', type: 'select', minWidthClass: 'min-w-[100px]',
      options: [{ value: 'normal', label: '一般' }, { value: 'important', label: '重要' }, { value: 'urgent', label: '緊急' }],
    },
    { key: 'isPinned', label: '置頂', type: 'toggle', inList: false },
    { key: 'expiredAt', label: '到期日(ISO)', inList: false, placeholder: '2026-12-31T00:00:00Z' },
  ],
};

// ── 帳號與權限（職務↔畫面權限）──────────────────────────
export const ROLE_VIEW_MASTER: EntityMasterConfig = {
  basePath: 'nx01/role-views',
  category: '帳號與權限',
  title: '職務權限設定',
  entityNoun: '職務權限',
  errorCodePrefix: 'nxui_base_role_view',
  deleteMode: SOFT,
  fields: [
    { key: 'roleId', label: '職務', type: 'ref', refBasePath: 'nx01/roles', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'viewId', label: '畫面', type: 'ref', refBasePath: 'nx01/views', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'canRead', label: '可讀取', type: 'toggle', defaultValue: true },
    { key: 'canCreate', label: '可新增', type: 'toggle', defaultValue: false },
    { key: 'canUpdate', label: '可編輯', type: 'toggle', defaultValue: false },
    { key: 'canDelete', label: '可刪除', type: 'toggle', defaultValue: false },
    { key: 'canExport', label: '可匯出', type: 'toggle', defaultValue: false },
  ],
};

// ── 折扣代碼（F1-A 銷貨優惠價子系統 2026-06-08）────────────────
// 業務員自助管理 DEFECT/USED/VIP/BULK 等代碼、配合 QuoteItem/SoItem.discountCodeId 引用
// 預設 seed 4 碼、業務員可依需要新增（例：CLEAR 出清、HOLIDAY 節慶等）
export const DISCOUNT_CODE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/discount-codes',
  category: '銷售管理',
  title: '折扣代碼',
  entityNoun: '折扣代碼',
  errorCodePrefix: 'nxui_base_discount_code',
  deleteMode: SOFT,
  fields: [
    {
      key: 'code', label: '代碼', required: true, uppercase: true, lockedOnEdit: true,
      mono: true, maxLength: 20,
      placeholder: '例：DEFECT / USED / VIP / BULK',
      minWidthClass: 'min-w-[100px]',
    },
    {
      key: 'name', label: '名稱', required: true, maxLength: 50,
      placeholder: '例：瑕疵品折扣、中古件折扣',
      minWidthClass: 'min-w-[160px]',
    },
    {
      key: 'discountType', label: '折扣方式', type: 'select', required: true, defaultValue: 'P',
      minWidthClass: 'min-w-[100px]',
      options: [
        { value: 'P', label: 'P 率%' },
        { value: 'A', label: 'A 金額' },
      ],
    },
    {
      key: 'discountValue', label: '折扣值', type: 'number', required: true,
      placeholder: 'P：百分比（20 表 8 折）/ A：固定金額',
      minWidthClass: 'min-w-[120px]',
    },
    {
      key: 'managedBy', label: '管理角色', type: 'select', defaultValue: 'P',
      minWidthClass: 'min-w-[100px]',
      options: [
        { value: 'P', label: 'P 採購組長' },
        { value: 'S', label: 'S 銷售組長' },
      ],
    },
    { key: 'remark', label: '備註', inList: false, maxLength: 200 },
  ],
};


