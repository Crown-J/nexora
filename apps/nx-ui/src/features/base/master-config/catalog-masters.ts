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

import type { EntityMasterConfig } from '@/features/master-shell/entity-master/config';

const SOFT = 'soft-delete-rest' as const;

// ── 帳號與權限 ──────────────────────────────────────────
export const ROLE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/roles',
  category: '帳號與權限',
  title: '職務主檔',
  entityNoun: '職務',
  errorCodePrefix: 'nxui_base_role',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '職務代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[120px]' },
    { key: 'name', label: '職務名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'description', label: '說明', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 車型字典 ────────────────────────────────────────────
export const DRIVETRAIN_MASTER: EntityMasterConfig = {
  basePath: 'nx01/drivetrains',
  category: '車型字典',
  title: '傳動方式主檔',
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
  title: '車體類型主檔',
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
  title: '車廠品牌主檔',
  entityNoun: '車廠品牌',
  errorCodePrefix: 'nxui_base_car_brand',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '品牌代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '品牌名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'nameEn', label: '英文名稱', inList: false },
    { key: 'countryId', label: '國別', type: 'ref', refBasePath: '/country', minWidthClass: 'min-w-[120px]' },
    { key: 'logoUrl', label: 'Logo 網址', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const ENGINE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/engines',
  category: '車型字典',
  title: '引擎主檔',
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
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/car-brands', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const TRANSMISSION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/transmissions',
  category: '車型字典',
  title: '變速箱主檔',
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
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/car-brands', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const MODEL_MASTER: EntityMasterConfig = {
  basePath: 'nx01/models',
  category: '車型字典',
  title: '車型主檔',
  entityNoun: '車型',
  errorCodePrefix: 'nxui_base_model',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '車型代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '車型名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/car-brands', required: true, minWidthClass: 'min-w-[120px]' },
    { key: 'modelYearFrom', label: '年式(起)', type: 'number', required: true },
    { key: 'modelYearTo', label: '年式(迄)', type: 'number', inList: false },
    { key: 'engineId', label: '引擎', type: 'ref', refBasePath: 'nx01/engines', inList: false },
    { key: 'transmissionId', label: '變速箱', type: 'ref', refBasePath: 'nx01/transmissions', inList: false },
    { key: 'drivetrainId', label: '傳動方式', type: 'ref', refBasePath: 'nx01/drivetrains', inList: false },
    { key: 'modelTypeId', label: '車體類型', type: 'ref', refBasePath: 'nx01/model-types', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

// ── 產品料號 ────────────────────────────────────────────
export const PART_BRAND_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-brands',
  category: '產品料號',
  title: '零件廠牌主檔',
  entityNoun: '零件廠牌',
  errorCodePrefix: 'nxui_base_part_brand',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '廠牌代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '廠牌名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'countryId', label: '國別', type: 'ref', refBasePath: '/country', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const PART_RELATION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-relations',
  category: '產品料號',
  title: '零件關聯主檔',
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
  title: '料件車型適配主檔',
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
  title: '倉庫主檔',
  entityNoun: '倉庫',
  errorCodePrefix: 'nxui_base_warehouse',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '倉庫代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '倉庫名稱', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'warehouseTypeId', label: '倉別', type: 'ref', refBasePath: 'nx01/warehouse-types', inList: false },
    { key: 'remark', label: '備註', inList: false },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const WAREHOUSE_TYPE_MASTER: EntityMasterConfig = {
  basePath: 'nx01/warehouse-types',
  category: '組織架構',
  title: '倉別主檔',
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
  title: '客戶分級主檔',
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

export const PARTNER_MASTER: EntityMasterConfig = {
  basePath: 'nx01/partners',
  category: '交易對象',
  title: '往來對象主檔',
  entityNoun: '往來對象',
  errorCodePrefix: 'nxui_base_partner',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '對象代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[110px]' },
    { key: 'name', label: '對象名稱', required: true, minWidthClass: 'min-w-[160px]' },
    {
      key: 'partnerType', label: '對象類型', type: 'select', required: true, minWidthClass: 'min-w-[120px]',
      // 代碼語意由 Crown 2026-05-26 定案；CUST/SUP 為相容舊資料碼（新增不建議用）
      options: [
        { value: 'C', label: '客戶' },
        { value: 'S', label: '供應商' },
        { value: 'T', label: '運輸商' },
        { value: 'V', label: '廠商' },
        { value: 'B', label: '銀行' },
        { value: 'BOTH', label: '客戶兼供應商' },
        { value: 'CUST', label: '客戶（舊碼）' },
        { value: 'SUP', label: '供應商（舊碼）' },
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

// ── 系統設定 ────────────────────────────────────────────
export const PHONETIC_DICTIONARY_MASTER: EntityMasterConfig = {
  basePath: 'nx01/phonetic-dictionary',
  category: '系統設定',
  title: '注音字典主檔',
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
export const LOCATION_MASTER: EntityMasterConfig = {
  basePath: 'nx01/locations',
  category: '組織架構',
  title: '據點主檔',
  entityNoun: '據點',
  errorCodePrefix: 'nxui_base_location',
  deleteMode: SOFT,
  fields: [
    { key: 'warehouseId', label: '所屬倉庫', type: 'ref', refBasePath: 'nx01/warehouses', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'code', label: '據點代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[110px]' },
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
  title: '零件主檔',
  entityNoun: '零件',
  errorCodePrefix: 'nxui_base_part',
  deleteMode: SOFT,
  fields: [
    { key: 'code', label: '料號', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[140px]' },
    { key: 'name', label: '品名', required: true, minWidthClass: 'min-w-[160px]' },
    // codeRuleId 後端強制必填（須先有品牌料號規則）
    { key: 'codeRuleId', label: '編碼規則', type: 'ref', refBasePath: 'nx01/brand-code-rules', refLabelKeys: ['name'], required: true, inList: false },
    { key: 'partBrandId', label: '零件廠牌', type: 'ref', refBasePath: 'nx01/part-brands', minWidthClass: 'min-w-[120px]' },
    { key: 'partGroupId', label: '零件群組', type: 'ref', refBasePath: '/part-group', inList: false },
    { key: 'countryId', label: '產地', type: 'ref', refBasePath: '/country', inList: false },
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
  title: '品牌料號規則主檔',
  entityNoun: '品牌料號規則',
  errorCodePrefix: 'nxui_base_brand_code_rule',
  deleteMode: SOFT,
  minPlan: 'PLUS',
  fields: [
    { key: 'carBrandId', label: '車廠品牌', type: 'ref', refBasePath: 'nx01/car-brands', required: true, minWidthClass: 'min-w-[140px]' },
    { key: 'name', label: '規則名稱', required: true, minWidthClass: 'min-w-[160px]' },
    { key: 'description', label: '說明', type: 'textarea', inList: false },
    { key: 'segCount', label: '分段數', type: 'number', required: true, minWidthClass: 'min-w-[80px]' },
    {
      key: 'segDefinitions', label: '分段定義', type: 'json', required: true, inList: false,
      placeholder: '[{"seg_no":1,"name":"類別","length_min":2,"length_max":2,"charset":"alpha","required":true}]',
    },
    { key: 'separator', label: '分隔符', inList: false },
    { key: 'sourceCodePrefix', label: '來源碼前綴', inList: false },
    { key: 'examplePartCode', label: '範例料號', inList: false },
  ],
};

// ── 公告 ────────────────────────────────────────────────
export const BULLETIN_MASTER: EntityMasterConfig = {
  basePath: 'nx01/bulletins',
  category: '系統設定',
  title: '公告主檔',
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

