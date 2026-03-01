/**
 * File: apps/nx-ui/src/features/nx00/part/meta/part.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-FIELDS-001：Part fields meta（中文標籤/列表預設/排序/篩選）
 */

export type PartFieldKey =
    | 'code'
    | 'name'
    | 'brandId'
    | 'brandCode'
    | 'brandName'
    | 'spec'
    | 'uom'
    | 'isActive'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type PartFieldDef = {
    key: PartFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const PART_FIELDS: PartFieldDef[] = [
    { key: 'code', label: '料號', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '品名', inList: true, sortable: true, filterable: true },

    { key: 'brandName', label: '品牌', inList: true, sortable: true, filterable: true },
    { key: 'spec', label: '規格', inList: true, sortable: true, filterable: true },
    { key: 'uom', label: '單位', inList: true, sortable: true, filterable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'brandId', label: '品牌ID', inList: false, sortable: true },
    { key: 'brandCode', label: '品牌代碼', inList: false, sortable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];