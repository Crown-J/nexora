/**
 * File: apps/nx-api/src/users/users.dto.ts
 * Purpose: NX00-API-001 Users DTO (safe output / create / update / password)
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
  updatedAt: string | null;
};

export type ListUsersQuery = {
  q?: string;
  page?: number;      // 1-based
  pageSize?: number;  // 1..100
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
  password?: string;          // default "changeme"
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;         // default true
  statusCode?: string;        // default "A"
};

export type UpdateUserBody = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  statusCode?: string;
  password?: string;          // 可選：若填才更新 hash（也可改用專用 /password）
};

export type SetActiveBody = { isActive: boolean };

export type ChangePasswordBody = {
  password: string;
};
