/**
 * File: apps/nx-ui/src/features/auth/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-001：Auth 模組共用型別
 */

export type LoginRequest = {
  account: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user?: {
    id: string;
    username?: string;
    display_name?: string | null;
  };
};

export type MeResponse = {
  id: string;
  username: string;
  display_name?: string | null;
  displayName?: string | null;
  roles?: string[];
};

/** `/auth/me` 與 Demo 假 session 共用（snake / camel 與後端相容） */
export type MeDto = {
  id: string;
  username: string;
  display_name?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  /** 角色代碼（例：ADMIN），來自 /auth/me */
  roles?: string[];
  uu_sta?: string;
  statusCode?: string;
  uu_rmk?: string | null;
  remark?: string | null;
  last_login_at?: string | null;
  lastLoginAt?: string | null;
};