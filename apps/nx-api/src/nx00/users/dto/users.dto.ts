/**
 * File: apps/nx-api/src/users/dto/users.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USERS-DTO-001：Users DTO（safe output / create / update / password）
 *
 * Notes:
 * - 增加 createdByName / updatedByName：由 service include createdByUser/updatedByUser 映射而來
 */

export type UserSafeDto = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  statusCode: string;
  lastLoginAt: string | null;

  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;

  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type ListUsersQuery = {
  q?: string;
  page?: number; // 1-based
  pageSize?: number; // 1..100
  isActive?: boolean;
  statusCode?: string;
};

export type ListUsersResponse = {
  items: UserSafeDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateUserBody = {
  username: string;
  displayName: string;
  password?: string; // default "changeme"
  email?: string | null;
  phone?: string | null;
  isActive?: boolean; // default true
  statusCode?: string; // default "A"
  remark?: string | null; // 若 DB 有此欄位才會用到
};

export type UpdateUserBody = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  statusCode?: string;
  password?: string;
  remark?: string | null; // 若 DB 有此欄位才會用到
};

export type SetActiveBody = { isActive: boolean };

export type ChangePasswordBody = {
  password: string;
};