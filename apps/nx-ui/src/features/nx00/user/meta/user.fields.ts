/**
 * File: apps/nx-ui/src/features/nx00/user/meta/user.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-FIELDS-001：User fields meta（中文標籤/列表預設/排序/篩選）
 *
 * Notes:
 * - 這份清單為列表欄位 SSOT（可顯示欄位、順序、中文 label）
 * - createdByName/updatedByName 若後端有回傳，可直接切換顯示
 */

export type UserFieldKey =
    | 'username'
    | 'displayName'
    | 'email'
    | 'phone'
    | 'isActive'
    | 'lastLoginAt'
    | 'createdAt'
    | 'createdBy'
    | 'createdByName'
    | 'updatedAt'
    | 'updatedBy'
    | 'updatedByName';

export type UserFieldDef = {
    key: UserFieldKey;
    label: string;
    inList: boolean;
    sortable?: boolean;
    filterable?: boolean;
};

export const USER_FIELDS: UserFieldDef[] = [
    { key: 'username', label: '帳號', inList: true, sortable: true, filterable: true },
    { key: 'displayName', label: '顯示名稱', inList: true, sortable: true, filterable: true },
    { key: 'email', label: 'Email', inList: true, sortable: true, filterable: true },
    { key: 'phone', label: '電話', inList: true, sortable: true, filterable: true },
    { key: 'isActive', label: '啟用', inList: true, sortable: true, filterable: true },

    { key: 'lastLoginAt', label: '最後登入', inList: false, sortable: true },

    { key: 'createdAt', label: '建立時間', inList: false, sortable: true },
    { key: 'createdBy', label: '建立人ID', inList: false, sortable: true },
    { key: 'createdByName', label: '建立人', inList: false, sortable: true },

    { key: 'updatedAt', label: '更新時間', inList: false, sortable: true },
    { key: 'updatedBy', label: '更新人ID', inList: false, sortable: true },
    { key: 'updatedByName', label: '更新人', inList: false, sortable: true },
];