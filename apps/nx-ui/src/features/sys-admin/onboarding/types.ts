// apps/nx-ui/src/features/sys-admin/onboarding/types.ts
// v1.2 對齊軌 C：開戶後台型別

export interface CreateOnboardingPayload {
  companyName: string;
  companyNameEn?: string;
  taxId: string;
  address: string;
  phone?: string;
  logoUrl: string;
  planCode: 'LITE' | 'PLUS' | 'PRO';
  tenantCode?: string;
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
