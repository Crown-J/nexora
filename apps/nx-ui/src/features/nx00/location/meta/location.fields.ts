/**
 * File: apps/nx-ui/src/features/nx00/location/meta/location.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-FIELDS-001：Location fields meta
 */

export type LocationFieldKey =
    | 'code'
    | 'name'
    | 'zone'
    | 'rack'
    | 'levelNo'
    | 'binNo'
    | 'sortNo'
    | 'isActive'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type LocationFieldDef = {
    key: LocationFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const LOCATION_FIELDS: LocationFieldDef[] = [
    { key: 'code', label: '庫位代碼', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '名稱', inList: true, sortable: true, filterable: true },
    { key: 'zone', label: '區域', inList: true, sortable: true, filterable: true },
    { key: 'rack', label: '架', inList: true, sortable: true, filterable: true },
    { key: 'levelNo', label: '層', inList: true, sortable: true, filterable: true },
    { key: 'binNo', label: '格', inList: true, sortable: true, filterable: true },
    { key: 'sortNo', label: '排序', inList: false, sortable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];