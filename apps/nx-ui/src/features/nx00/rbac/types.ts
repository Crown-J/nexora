/**
 * File: apps/nx-ui/src/features/nx00/rbac/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-TYPES-001：RBAC 前端型別（Role / Member / Candidate）
 *
 * Notes:
 * - 前端統一 camelCase
 * - Role 描述欄位統一使用 desc（避免 UI 被後端 description 綁死）
 */

export type RoleListItem = {
  id: string;
  code?: string;
  name: string;

  /** UI 統一使用 desc；由 API client 做 mapping（description -> desc） */
  desc?: string | null;

  isActive?: boolean;
};

export type UserLite = {
  id: string;
  username: string;

  displayName?: string | null;
  email?: string | null;
  phone?: string | null;

  isActive?: boolean;
};

export type RoleMembersDto = {
  roleId: string;
  members: UserLite[];
};

export type CreateRoleInput = {
  code: string;
  name: string;
  desc?: string | null;
  isActive?: boolean;
};