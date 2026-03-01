/**
 * File: apps/nx-ui/src/features/nx00/brand/meta/brand.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-BRAND-FIELDS-001：Brand fields meta（中文標籤/列表預設/排序/篩選）
 */

export type BrandFieldKey =
    | 'code'
    | 'name'
    | 'originCountry'
    | 'remark'
    | 'sortNo'
    | 'isActive'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type BrandFieldDef = {
    key: BrandFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const BRAND_FIELDS: BrandFieldDef[] = [
    { key: 'code', label: '品牌代碼', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '品牌名稱', inList: true, sortable: true, filterable: true },
    { key: 'originCountry', label: '產地/國家', inList: true, sortable: true, filterable: true },
    { key: 'sortNo', label: '排序', inList: true, sortable: true, filterable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'remark', label: '備註', inList: false, sortable: true, filterable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];