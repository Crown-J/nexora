// apps/nx-ui/src/features/base/master-config/simple-masters.ts
/**
 * 簡單平面主檔的 EntityMasterConfig 集合（鋼鐵星球範式）
 *
 * 對齊舊「彈窗範式」BaseModalCodeMasterView 的欄位 / endpoint，
 * 改用鋼鐵星球 EntityMasterPage 呈現（桌面 + 手機 + 全鍵盤）。
 *
 * code 大寫規則對齊舊範式：僅國家代碼轉大寫（其餘維持輸入）。
 */

import type { EntityMasterConfig } from '@/features/nx01/shell/entity-master/config';

export const CURRENCY_MASTER: EntityMasterConfig = {
  basePath: 'nx01/currencies',
  category: '系統設定',
  title: '幣別基本資料',
  entityNoun: '幣別',
  pageId: 'currency',
  errorCodePrefix: 'nxui_base_currency',
  deleteMode: 'soft-delete-rest',
  fields: [
    { key: 'code', label: '幣別代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]', placeholder: 'TWD' },
    { key: 'name', label: '幣別名稱', required: true, minWidthClass: 'min-w-[140px]', placeholder: '新台幣' },
    { key: 'symbol', label: '幣別符號', placeholder: 'NT$' },
    { key: 'decimalPlaces', label: '小數位數', type: 'number', defaultValue: '2' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const COUNTRY_MASTER: EntityMasterConfig = {
  basePath: 'nx01/countries',
  category: '系統設定',
  title: '國家基本資料',
  entityNoun: '國家',
  pageId: 'country',
  errorCodePrefix: 'nxui_base_country',
  deleteMode: 'soft-delete-rest',
  fields: [
    { key: 'code', label: '國家代碼', required: true, uppercase: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]', placeholder: 'TW' },
    { key: 'name', label: '國家名稱', required: true, minWidthClass: 'min-w-[140px]', placeholder: '台灣' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};

export const PART_GROUP_MASTER: EntityMasterConfig = {
  basePath: 'nx01/part-groups',
  category: '產品料號',
  title: '零件群組基本資料',
  entityNoun: '零件群組',
  pageId: 'part-group',
  errorCodePrefix: 'nxui_base_part_group',
  deleteMode: 'soft-delete-rest',
  fields: [
    { key: 'code', label: '族群代碼', required: true, lockedOnEdit: true, mono: true, minWidthClass: 'min-w-[100px]' },
    { key: 'name', label: '族群名稱', required: true, minWidthClass: 'min-w-[140px]' },
    // 02 第四批 軌 6 2026-06-07：族群層預設保存期限（新增零件選此族群時自動帶入個別零件、可覆寫）
    { key: 'defaultShelfLifeMonths', label: '預設建議保存期限(月)', type: 'number', placeholder: '12', minWidthClass: 'min-w-[140px]' },
    { key: 'sortNo', label: '排序', type: 'number', defaultValue: '0', inList: false },
  ],
};
