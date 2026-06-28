// apps/nx-ui/src/data/types/settings/permission-level.ts
// 職務↔權限拆分軌 Step5：權限等級型別

export interface PermissionLevel {
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

export interface CreatePermissionLevelPayload {
  code: string;
  name: string;
  description?: string;
  sortNo?: number;
  isActive?: boolean;
}

export interface UpdatePermissionLevelPayload {
  name?: string;
  description?: string | null;
  sortNo?: number;
  isActive?: boolean;
}

/** 等級的權限集合（編輯預填用） */
export interface LevelPermissionsResponse {
  levelId: string;
  code: string;
  name: string;
  isActive: boolean;
  isSystem: boolean;
  permissions: {
    id: string;
    code: string;
    moduleCode: string;
    category: string;
    action: string;
    name: string;
    description: string | null;
    sortNo: number;
    isActive: boolean;
  }[];
}
