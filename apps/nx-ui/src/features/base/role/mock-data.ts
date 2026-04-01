/**
 * File: apps/nx-ui/src/features/base/role/mock-data.ts
 *
 * Purpose:
 * - 職務主檔測試資料與角色—使用者對照（不接 API）
 */

export type BaseRoleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string | null;
  createdBy?: string | null;
  createdByName?: string;
  updatedBy?: string | null;
  updatedByName?: string | null;
};

/** 某職務底下的使用者指派（mock） */
export type BaseRoleMemberRow = {
  id: string;
  userId: string;
  isPrimary: boolean;
};

export const MOCK_BASE_ROLES: BaseRoleRow[] = [
  {
    id: 'r1',
    code: 'ADMIN',
    name: '管理者',
    description: '全系統設定與主檔維護',
    sortOrder: 10,
    isActive: true,
    isSystem: true,
    createdAt: '2025-01-05T10:00:00',
    updatedAt: '2026-03-01T09:00:00',
  },
  {
    id: 'r2',
    code: 'TAX',
    name: '會計人員',
    description: '帳務、稅務與財務報表',
    sortOrder: 20,
    isActive: true,
    isSystem: false,
    createdAt: '2025-01-05T10:00:00',
    updatedAt: null,
  },
  {
    id: 'r3',
    code: 'SALES',
    name: '業務',
    description: '報價、訂單與客戶聯繫',
    sortOrder: 30,
    isActive: true,
    isSystem: false,
    createdAt: '2025-01-05T10:00:00',
    updatedAt: null,
  },
  {
    id: 'r4',
    code: 'WH',
    name: '倉管',
    description: '入出庫與庫存異動',
    sortOrder: 40,
    isActive: true,
    isSystem: false,
    createdAt: '2025-01-05T10:00:00',
    updatedAt: null,
  },
];

/** roleId -> 成員列（userId 對應 base users mock） */
export const MOCK_ROLE_MEMBERS_BY_ROLE: Record<string, BaseRoleMemberRow[]> = {
  r1: [{ id: 'rm-r1-u1', userId: 'u1', isPrimary: true }],
  r2: [],
  r3: [{ id: 'rm-r3-u4', userId: 'u4', isPrimary: true }],
  r4: [
    { id: 'rm-r4-u2', userId: 'u2', isPrimary: true },
    { id: 'rm-r4-u3', userId: 'u3', isPrimary: false },
  ],
};
