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