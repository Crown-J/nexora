/**
 * File: apps/nx-ui/src/features/nx00/role/meta/role.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-FIELDS-001：Role fields meta（中文標籤/列表預設/排序/篩選）
 *
 * Notes:
 * - 這份清單為列表欄位 SSOT（可顯示欄位、順序、中文 label）
 * - createdByName/updatedByName 若後端有回傳，可直接切換顯示
 */

export type RoleFieldKey =
    | 'code'
    | 'name'
    | 'description'
    | 'isActive'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type RoleFieldDef = {
    key: RoleFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const ROLE_FIELDS: RoleFieldDef[] = [
    { key: 'code', label: '角色代碼', inList: true, sortable: true, filterable: true },
    { key: 'name', label: '角色名稱', inList: true, sortable: true, filterable: true },
    { key: 'description', label: '說明', inList: true, sortable: true, filterable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];