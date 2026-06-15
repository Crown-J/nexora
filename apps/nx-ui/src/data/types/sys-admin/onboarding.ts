// apps/nx-ui/src/features/sys-admin/onboarding/types.ts
// v1.2 對齊軌 C：開戶後台型別
// 平台/租戶層分離軌 Phase 6.3：tenantCode 移除（系統自動產 TW/ZT-{6digits}）、加 isTest
// LOGO 上傳軌：logoUrl 改 logoStorageKey?（選填、開戶頁先 upload-logo 拿）
// 員工編號制改造（2026-06-02）：加 ownerEmployeeAccount（登入用、自由輸入）、
//   ownerEmail 改聯絡用（非登入帳號）

export interface CreateOnboardingPayload {
  companyName: string;
  companyNameEn?: string;
  taxId: string;
  address: string;
  phone?: string;
  logoStorageKey?: string;
  planCode: 'LITE' | 'PLUS' | 'PRO';
  isTest?: boolean;
  ownerName: string;
  ownerEmployeeAccount: string;
  ownerEmail: string;
  initialPassword?: string;
  mainWarehouseName?: string;
  mainWarehouseAddress?: string;
}

export interface OnboardingResponse {
  tenantId: string;
  tenantCode: string;
  ownerUserId: string;
  ownerEmployeeAccount: string;
  ownerEmail: string;
  initialPassword: string;
  mainWarehouseId: string;
  message: string;
}
