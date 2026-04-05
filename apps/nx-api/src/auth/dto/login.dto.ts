// C:\nexora\apps\nx-api\src\auth\dto\login.dto.ts
// LoginDto：登入請求 body

import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** 租戶代碼（選填）；有值時與 username 鎖定唯一使用者，避免多公司同帳號時 findFirst 誤判 */
  @IsOptional()
  @IsString()
  tenantCode?: string;
}
