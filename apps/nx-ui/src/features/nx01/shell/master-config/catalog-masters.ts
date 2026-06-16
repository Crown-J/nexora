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

/** 品牌料號規則：依 SEG 字數即時組出料號樣式預覽（SEG 一律單空格、不加品牌 / 產地）：XXX XXX XXX X */
function brandCodeRulePreview(v: Record<string, unknown>): string {
  const lens = [1, 2, 3, 4, 5].map((n) => Number(v[`seg${n}Length`] ?? 0));
  const parts = lens.filter((n) => n > 0).map((n) => 'X'.repeat(n));
  return parts.length > 0 ? parts.join(' ') : '—';
}

// ── 帳號與權限 ──────────────────────────────────────────
export const ROLE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/roles',
  category: '帳號與權限',
  title: '職務基本資料',
  entityNoun: '職務',
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
export const DRIVETRAIN_MASTER: EntityMasterConfig = {
  basePath: 'nx01/drivetrains',
  category: '車型字典',
  title: '傳動方式基本資料',
  entityNoun: '傳動方式',
  errorCodePrefix: 'nxui_base_drivetrain',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const MODEL_TYPE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/model-types',
  category: '車型字典',
  title: '車體類型基本資料',
  entityNoun: '車體類型',
  errorCodePrefix: 'nxui_base_model_type',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

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

export const ENGINE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/engines',
  category: '車型字典',
  title: '引擎基本資料',
  entityNoun: '引擎',
  errorCodePrefix: 'nxui_base_engine',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '引擎代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '引擎名稱', required: true, minWidthClass: 'min-w-[140px]' },
    {
      key: 'fuelType', label: '燃料別', type: 'select', numeric: true, required: true, minWidthClass: 'min-w-[100px]',
      options: [{ value: 1, label: '汽油' }, { value: 2, label: '柴油' }, { value: 3, label: '油電 Hybrid' }, { value: 4, label: '純電 EV' }],
    },
    { key: 'displacementCc', label: '排氣量(cc)', type: 'number', inList: false },
    {
      key: 'aspirationType', label: '進氣方式', type: 'select', numeric: true, inList: false,
      options: [{ value: 1, label: '自然進氣 NA' }, { value: 2, label: '渦輪 TC' }, { value: 3, label: '機械增壓 SC' }, { value: 4, label: '雙增壓' }],
    },
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isCar: 'true' }, inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const TRANSMISSION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/transmissions',
  category: '車型字典',
  title: '變速箱基本資料',
  entityNoun: '變速箱',
  errorCodePrefix: 'nxui_base_transmission',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '名稱', required: true, minWidthClass: 'min-w-[140px]' },
    {
      key: 'transmissionType', label: '變速型式', type: 'select', numeric: true, required: true, minWidthClass: 'min-w-[100px]',
      options: [
        { value: 1, label: '手排' }, { value: 2, label: '自排' }, { value: 3, label: '雙離合' },
        { value: 4, label: 'CVT' }, { value: 5, label: 'AMT' }, { value: 6, label: '其他' },
      ],
    },
    { key: 'gearCount', label: '檔位數', type: 'number', inList: false },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isCar: 'true' }, inList: false },
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
    { key: 'engineId', label: '引擎', type: 'ref', refBasePath: 'nx01/engines', inList: false },
    { key: 'transmissionId', label: '變速箱', type: 'ref', refBasePath: 'nx01/transmissions', inList: false },
    { key: 'drivetrainId', label: '傳動方式', type: 'ref', refBasePath: 'nx01/drivetrains', inList: false },
    { key: 'modelTypeId', label: '車體類型', type: 'ref', refBasePath: 'nx01/model-types', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── W6 [3-8] 2026-06-06 品牌合併：新 Brand 主檔（合 PartBrand + CarBrand 雙開關） ────
export const BRAND_MASTER: EntityMasterConfig = {
  basePath: 'nx01/brands',
  category: '產品料號',
  title: '品牌基本資料',
  entityNoun: '品牌',
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

// ── 通用件群組 / 02 對齊第二批 C 軌 CP2-c ──────────────────
// 群組主檔本身 CRUD；member 多對多衛星表（成員 / 角色 / 各自售價 / 雙向）由
// dashboard/base/part-compat-group/[id] 詳細頁編輯（後續軌補 UI；endpoint 已暴露 /nx01/part-compat-groups/:id/members）。
export const PART_COMPAT_GROUP_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-compat-groups',
  category: '產品料號',
  title: '通用件群組基本資料',
  entityNoun: '通用件群組',
  errorCodePrefix: 'nxui_base_part_compat_group',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '群組代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[140px]' },
    { key: 'name', label: '群組名稱', required: true, minWidthClass: 'min-w-[200px]' },
    { key: 'remark', label: '備註', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 客戶分類 / 02 對齊第二批 C 軌 CP1 ─────────────────────
export const REGION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/regions',
  category: '客戶分類',
  title: '地區基本資料',
  entityNoun: '地區',
  errorCodePrefix: 'nxui_base_region',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '地區代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '地區名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 產品料號 ────────────────────────────────────────────
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
  fields: [
    { key: 'partIdFrom', label: '來源零件', type: 'ref', refBasePath: 'nx01/parts', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'partIdTo', label: '目標零件', type: 'ref', refBasePath: 'nx01/parts', required: true, minWidthClass: 'min-w-[160px]' },
    {
      key: 'relationType', label: '關聯類型', type: 'select', numeric: true, required: true, minWidthClass: 'min-w-[100px]',
      options: [
        { value: 1, label: '改號' }, { value: 2, label: '同款' }, { value: 3, label: '改版' },
        { value: 4, label: '組合' }, { value: 5, label: '拆解' },
      ],
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
// 這是工作流第 2 步「查可跟誰詢價」的核心主檔：哪家供應商賣哪些料件、
// 廠商料號 / 預設單價 / 預設交期 / MOQ / 主要供應商旗標。
// 三版本一致（schema 啟用最低需求版本 = LITE-CORE、不掛任何 minPlan）。
// 後端：apps/nx-api/src/nx02/partner-part（5 endpoint：list/getById/create/patch/softDelete）
export const PARTNER_PART_MASTER: EntityMasterConfig = {
  basePath: 'nx02/partner-part',
  category: '交易對象',
  title: '供應商供貨對應',
  entityNoun: '供貨對應',
  errorCodePrefix: 'nxui_base_partner_part',
  deleteMode: SOFT,
  fields: [
    {
      key: 'partnerId', label: '供應商', type: 'ref', required: true,
      refBasePath: 'nx01/partners',
      // 後端 service.assertPartnerIsSupplier 守 partnerType='S'，UI 也只列純供應商
      refExtraFilters: { partnerType: 'S' },
      minWidthClass: 'min-w-[180px]',
      lockedOnEdit: true,
    },
    {
      key: 'partId', label: '料件', type: 'ref', required: true,
      refBasePath: 'nx01/parts',
      minWidthClass: 'min-w-[180px]',
      lockedOnEdit: true,
    },
    {
      key: 'isPrimary', label: '主要供應商', type: 'toggle', defaultValue: false,
      minWidthClass: 'min-w-[110px]',
    },
    {
      key: 'supplierPartNo', label: '廠商料號', maxLength: 50,
      minWidthClass: 'min-w-[140px]',
      placeholder: '例：Bosch 0986AS0050',
    },
    {
      key: 'defaultUnitCost', label: '預設單價', type: 'number',
      minWidthClass: 'min-w-[110px]',
    },
    {
      key: 'defaultLeadDays', label: '預設交期(天)', type: 'number',
      minWidthClass: 'min-w-[120px]',
    },
    {
      key: 'moq', label: 'MOQ', type: 'number',
      minWidthClass: 'min-w-[100px]',
    },
    {
      key: 'source', label: '來源', type: 'select', defaultValue: 'M',
      minWidthClass: 'min-w-[100px]',
      options: [
        { value: 'M', label: '手動維護' },
        { value: 'S', label: '系統同步' },
      ],
    },
    {
      key: 'validFrom', label: '生效起期', type: 'date', inList: false,
      // 後端 unique [tenantId, partnerId, partId, validFrom]、改 validFrom 等同新建
      lockedOnEdit: true,
    },
    { key: 'validTo', label: '生效迄期', type: 'date', inList: false },
    { key: 'remark', label: '備註', inList: false, maxLength: 200 },
  ],
};

// ── 系統設定 ────────────────────────────────────────────
export const PHONETIC_DICTIONARY_MASTER: EntityMasterConfig = {
  basePath: 'nx01/phonetic-dictionary',
  category: '系統設定',
  title: '注音字典基本資料',
  entityNoun: '注音字',
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
  errorCodePrefix: 'nxui_base_location',
  deleteMode: SOFT,
  fields: [
    { key: 'siteId', label: '所屬據點', type: 'ref', refBasePath: 'nx01/sites', minWidthClass: 'min-w-[140px]' },
    { key: 'warehouseId', label: '所屬倉庫', type: 'ref', refBasePath: 'nx01/warehouses', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'code', label: '庫位代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[110px]' },
    { key: 'name', label: '名稱', minWidthClass: 'min-w-[120px]' },
    { key: 'zone', label: '區', inList: false },
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
    { key: 'code', label: '料號', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[140px]' },
    { key: 'name', label: '品名', required: true, minWidthClass: 'min-w-[160px]' },
    // codeRuleId 後端強制必填（須先有品牌料號規則）
    { key: 'codeRuleId', label: '編碼規則', type: 'ref', refBasePath: 'nx01/brand-code-rules', refLabelKeys: ['name'], required: true, inList: false },
    { key: 'partBrandId', label: '零件廠牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isPart: 'true' }, minWidthClass: 'min-w-[120px]' },
    { key: 'partGroupId', label: '零件群組', type: 'ref', refBasePath: 'nx01/part-groups', inList: false },
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

export const BRAND_CODE_RULE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/brand-code-rules',
  category: '產品料號',
  title: '品牌料號規則基本資料',
  entityNoun: '品牌料號規則',
  errorCodePrefix: 'nxui_base_brand_code_rule',
  deleteMode: SOFT,
  minPlan: 'PLUS',
  fields: [
    { key: 'name', label: '規則名稱', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'partBrandId', label: '零件品牌', type: 'ref', refBasePath: 'nx01/brands', refExtraFilters: { isPart: 'true' }, required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'description', label: '說明', type: 'textarea', inList: false },
    { key: 'seg1Length', label: 'SEG1 最大字數', type: 'number', required: true, defaultValue: '3', minWidthClass: 'min-w-[90px]' },
    { key: 'seg2Length', label: 'SEG2 最大字數', type: 'number', required: true, defaultValue: '3', inList: false },
    { key: 'seg3Length', label: 'SEG3 最大字數', type: 'number', required: true, defaultValue: '3', inList: false },
    { key: 'seg4Length', label: 'SEG4 最大字數（0=不使用）', type: 'number', defaultValue: '1', inList: false },
    { key: 'seg5Length', label: 'SEG5 最大字數（0=不使用）', type: 'number', defaultValue: '0', inList: false },
    { key: 'preview', label: '分段預覽（SEG 單空格）', type: 'computed', inList: false, compute: brandCodeRulePreview },
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


