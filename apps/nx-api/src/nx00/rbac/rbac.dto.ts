/**
 * File: apps/nx-api/src/nx00/rbac/rbac.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-API-DTO-001：RBAC 管理 API DTO（Roles / Members / User search）
 */

export class RoleListItemDto {
  id!: string;
  code!: string;
  name!: string;
  description?: string | null;
  isActive!: boolean;
}

export class UserLiteDto {
  id!: string;
  username!: string;
  displayName!: string;
}

export class RoleMembersDto {
  roleId!: string;
  members!: UserLiteDto[];
}

export class AddRoleMemberDto {
  userId!: string;
}

export class OkDto {
  ok!: boolean;
}