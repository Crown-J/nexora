// apps/nx-ui/src/features/settings/roles/types.ts
// v1.2 對齊軌 A+B：設定→角色與權限型別

export interface PermissionCatalogItem {
  id: string;
  code: string;
  moduleCode: string;
  category: string;
  action: string;
  name: string;
  description: string | null;
  sortNo: number;
  isActive: boolean;
}

export interface RolePermissionsResponse {
  roleId: string;
  code: string;
  name: string;
  isActive: boolean;
  permissions: PermissionCatalogItem[];
}

export interface Role {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
  sortNo?: number;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  sortNo?: number;
  isActive?: boolean;
}

/// 模組 label 對應（給 UI 分組顯示）
export const MODULE_LABEL: Record<string, string> = {
  purchase: '進貨作業',
  sale: '銷貨作業',
  inventory: '庫存作業',
  finance: '財務作業',
  report: '報表',
  master: '主檔',
  settings: '設定',
};

export const MODULE_ORDER = ['purchase', 'sale', 'inventory', 'finance', 'report', 'master', 'settings'];
