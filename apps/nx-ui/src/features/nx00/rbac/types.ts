/**
 * File: apps/nx-ui/src/features/nx00/rbac/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-RBAC-TYPES-001：RBAC 前端型別（Role / Member / Candidate）
 */

export type RoleListItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type UserLite = {
  id: string;
  username: string;
  displayName?: string | null; // ✅ 允許 null
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

export type RoleMembersDto = {
  roleId: string;
  members: UserLite[];
};