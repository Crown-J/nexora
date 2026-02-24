/**
 * File: apps/nx-ui/src/features/nx00/permissions/meta/permissions.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PERM-FIELDS-001：Permission 欄位定義（label / ui meta）
 *
 * Notes:
 * - SplitView 表格欄位與 Form label 共用
 * - 風格對齊 roles：提供 inList / sortable / filterable，方便 ColumnPickerPanel 使用
 */

export type PermissionsFieldKey =
    | 'code'
    | 'name'
    | 'moduleCode'
    | 'action'
    | 'isActive'
    | 'sortNo'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type PermissionsFieldDef = {
    key: PermissionsFieldKey;
    label: string;        // 中文顯示
    inList: boolean;      // 預設是否顯示在列表
    sortable?: boolean;   // 表頭排序（目前先本地排序當頁）
    filterable?: boolean; // 先預留（下一步補）
};

/**
 * 欄位 SSOT：
 * - label：中文顯示
 * - inList：左側列表預設顯示欄位
 * - sortable/filterable：UI meta（先對齊 roles）
 */
export const PERMISSIONS_FIELDS: PermissionsFieldDef[] = [
    // ===== 基本資訊（預設顯示）=====
    { key: 'code', label: '代碼', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '名稱', inList: true, sortable: true, filterable: true },

    { key: 'moduleCode', label: '模組代碼', inList: true, sortable: true, filterable: true },
    { key: 'action', label: '動作', inList: true, sortable: true, filterable: true },

    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },
    { key: 'sortNo', label: '排序', inList: true, sortable: true, filterable: true },

    // ===== 稽核資訊（預設不顯示，但可在欄位面板勾選）=====
    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];

/**
 * 提供 key → label 快速查表（Form label / 其他 UI 可用）
 */
export const PERMISSIONS_FIELD_MAP: Record<PermissionsFieldKey, { label: string }> = PERMISSIONS_FIELDS.reduce(
    (acc, f) => {
        acc[f.key] = { label: f.label };
        return acc;
    },
    {} as Record<PermissionsFieldKey, { label: string }>,
);