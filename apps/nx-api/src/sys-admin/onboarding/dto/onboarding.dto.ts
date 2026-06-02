// apps/nx-api/src/sys-admin/onboarding/dto/onboarding.dto.ts
// v1.2 對齊軌 C：開戶後台 DTO
// 平台/租戶層分離軌 Phase 6.3：tenantCode 移除（系統自動產）、加 isTest 決定 TW/ZT 前綴

import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const PLAN_CODES = ['LITE', 'PLUS', 'PRO'] as const;

export class CreateOnboardingDto {
  /// 公司名稱（必填）
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  companyName!: string;

  /// 公司英文名稱（選填）
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyNameEn?: string;

  /// 統一編號（必填）
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  taxId!: string;

  /// 公司地址（必填、寄帳單用）
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  address!: string;

  /// 公司電話（選填）
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  /// LOGO storage key（選填、開戶頁先 POST /sys-admin/onboarding/upload-logo 拿到）
  /// Phase 6 軌外 LOGO 上傳支援：開戶當下不一定有 LOGO、可之後在設定裡補
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoStorageKey?: string;

  /// 訂閱方案（必填）
  @IsString()
  @IsIn(PLAN_CODES as unknown as string[])
  planCode!: 'LITE' | 'PLUS' | 'PRO';

  /// 是否為測試租戶（Phase 6.3）
  /// - false / 未填：正式客戶、code 用 TW-{6digits}（seq_tenant_code_tw）
  /// - true：測試租戶、code 用 ZT-{6digits}（seq_tenant_code_zt）
  /// 注意：tenantCode 不再開放手填、永遠由 sequence 自動產
  @IsOptional()
  @IsBoolean()
  isTest?: boolean;

  // ─── 負責人帳號 ───
  /// 負責人姓名（必填）
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  ownerName!: string;

  /// 負責人 Email（必填、登入用）
  @IsEmail()
  @MaxLength(100)
  ownerEmail!: string;

  /// 初始密碼（選填、系統可自動產）
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  initialPassword?: string;

  // ─── 主倉 ───
  /// 主倉名稱（選填、預設「主倉」）
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mainWarehouseName?: string;

  /// 主倉地址（選填、預設帶公司地址）
  @IsOptional()
  @IsString()
  @MaxLength(200)
  mainWarehouseAddress?: string;
}
