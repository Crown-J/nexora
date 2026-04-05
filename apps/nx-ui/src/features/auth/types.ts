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
  /** 與登入頁「公司帳號」對應，送後端為 tenantCode，避免多租戶同帳號誤登 */
  tenantCode?: string;
};

export type LoginResponse = {
  token: string;
  user?: {
    id: string;
    username?: string;
    display_name?: string | null;
  };
};

/** 與 nx00_role_view 五維對應；can_toggle_active＝啟用／停用 */
export type ViewPermissionSnake = {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_toggle_active: boolean;
  can_export: boolean;
};

export type MeResponse = {
  id: string;
  username: string;
  display_name?: string | null;
  displayName?: string | null;
  tenant_name?: string | null;
  tenant_name_en?: string | null;
  roles?: string[];
  plan_code?: string | null;
  /** nx00_view.code → 合併權限；ADMIN 為 null；無租戶為 {} */
  view_permissions?: Record<string, ViewPermissionSnake> | null;
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
  /** 租戶中文名（nx99_tenant.name） */
  tenant_name?: string | null;
  /** 租戶英文名（nx99_tenant.name_en） */
  tenant_name_en?: string | null;
  /** 訂閱方案代碼（例：NEXORA-LITE、NEXORA-PLUS；或簡寫 LITE、PLUS） */
  plan_code?: string | null;
  /** 與 JWT／部分閘道回應的 camelCase 相容（等同 plan_code） */
  planCode?: string | null;
  /** nx00_view.code → 合併權限；ADMIN 為 null；無租戶為 {} */
  view_permissions?: Record<string, ViewPermissionSnake> | null;
};