/**
 * File: apps/nx-ui/src/features/nx00/users/meta/users.fields.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-META-FIELDS-001：Users 欄位定義（中文顯示/表格設定/可篩選排序）
 */

export type UsersFieldKey =
    | 'username'
    | 'displayName'
    | 'email'
    | 'phone'
    | 'isActive'
    | 'statusCode'
    | 'remark'
    | 'lastLoginAt'
    | 'createdAt'
    | 'createdBy'
    | 'updatedAt'
    | 'updatedBy';

export type UsersFieldType = 'text' | 'bool' | 'datetime';

export type UsersFieldDef = {
    key: UsersFieldKey;
    label: string;          // ✅ 中文名稱
    type: UsersFieldType;
    inList: boolean;        // ✅ 預設是否顯示在 list
    sortable?: boolean;     // ✅ 是否可排序
    filterable?: boolean;   // ✅ 是否可篩選
};

export const USERS_FIELDS: UsersFieldDef[] = [
    { key: 'username', label: '帳號', type: 'text', inList: true, sortable: true, filterable: true },
    { key: 'displayName', label: '顯示名稱', type: 'text', inList: true, sortable: true, filterable: true },
    { key: 'email', label: 'Email', type: 'text', inList: true, sortable: true, filterable: true },
    { key: 'phone', label: '電話', type: 'text', inList: false, sortable: false, filterable: true },
    { key: 'isActive', label: '啟用', type: 'bool', inList: false, sortable: true, filterable: true },
    { key: 'statusCode', label: '狀態碼', type: 'text', inList: false, sortable: true, filterable: true },
    { key: 'remark', label: '備註', type: 'text', inList: false, sortable: false, filterable: true },

    { key: 'lastLoginAt', label: '最後登入', type: 'datetime', inList: false, sortable: true, filterable: false },
    { key: 'createdAt', label: '建立時間', type: 'datetime', inList: false, sortable: true, filterable: false },
    { key: 'createdBy', label: '建立人', type: 'text', inList: false, sortable: false, filterable: false },
    { key: 'updatedAt', label: '更新時間', type: 'datetime', inList: false, sortable: true, filterable: false },
    { key: 'updatedBy', label: '更新人', type: 'text', inList: false, sortable: false, filterable: false },
];

export const USERS_FIELD_MAP = Object.fromEntries(USERS_FIELDS.map((f) => [f.key, f])) as Record<
    UsersFieldKey,
    UsersFieldDef
>;