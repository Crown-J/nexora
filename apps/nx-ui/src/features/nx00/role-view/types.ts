/**
 * File: apps/nx-ui/src/features/nx00/role-view/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-TYPES-001：RoleView Matrix Types（SSOT）
 *
 * Notes:
 * - View 是 seed 資源表（通常不給一般 UI 新增）
 * - RoleView 是授權關聯 + CRUDX 權限矩陣
 */

export type ViewDto = {
    id: string;
    code: string;
    name: string;
    moduleCode: string;
    path: string;
    sortNo: number;
    isActive: boolean;

    createdAt?: string;
    updatedAt?: string | null;
};

export type RoleViewDto = {
    id: string;
    roleId: string;
    viewId: string;

    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExport: boolean;

    isActive: boolean;

    grantedAt: string;
    grantedBy: string | null;
    revokedAt: string | null;
    revokedBy: string | null;

    // 方便矩陣直接 render（若後端有 include）
    view?: ViewDto;
};

export type PermKey = 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canExport';

export type Perms = Record<PermKey, boolean>;

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

/**
 * 用於「前端本地 draft」
 * - recordId: 若存在 role_view 記錄則帶入；不存在則 null
 */
export type RoleViewDraftRow = {
    view: ViewDto;
    recordId: string | null;
    isActive: boolean;
    perms: Perms;
};

export type SaveOp =
    | { kind: 'grant'; viewId: string; perms: Perms }
    | { kind: 'updatePerms'; recordId: string; perms: Perms }
    | { kind: 'revoke'; recordId: string }
    | { kind: 'setActive'; recordId: string; isActive: boolean };