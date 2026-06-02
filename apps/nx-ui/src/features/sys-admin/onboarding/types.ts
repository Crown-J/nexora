// apps/nx-ui/src/features/sys-admin/onboarding/types.ts
// v1.2 對齊軌 C：開戶後台型別
// 平台/租戶層分離軌 Phase 6.3：tenantCode 移除（系統自動產 TW/ZT-{6digits}）、加 isTest

export interface CreateOnboardingPayload {
  companyName: string;
  companyNameEn?: string;
  taxId: string;
  address: string;
  phone?: string;
  logoUrl: string;
  planCode: 'LITE' | 'PLUS' | 'PRO';
  isTest?: boolean;
  ownerName: string;
  ownerEmail: string;
  initialPassword?: string;
  mainWarehouseName?: string;
  mainWarehouseAddress?: string;
}

export interface OnboardingResponse {
  tenantId: string;
  tenantCode: string;
  ownerUserId: string;
  ownerEmail: string;
  initialPassword: string;
  mainWarehouseId: string;
  message: string;
}
