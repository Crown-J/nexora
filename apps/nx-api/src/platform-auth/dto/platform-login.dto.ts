// apps/nx-api/src/platform-auth/dto/platform-login.dto.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台超管登入 DTO
//
// 跟 tenant 登入（LoginDto）差別：
// - 無 tenantCode 欄（平台超管不屬於任何租戶）
// - account 代替 username（語意清楚：跨平台唯一帳號）

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @IsNotEmpty({ message: '[PL-301]請輸入平台帳號。' })
  @IsString({ message: '[PL-301]請輸入平台帳號。' })
  @MinLength(1, { message: '[PL-301]請輸入平台帳號。' })
  @MaxLength(50, { message: '[PL-301]請輸入平台帳號。' })
  account!: string;

  @IsNotEmpty({ message: '[PL-302]請輸入密碼。' })
  @IsString({ message: '[PL-302]請輸入密碼。' })
  @MinLength(6, { message: '[PL-302]請輸入密碼。' })
  @MaxLength(100, { message: '[PL-302]請輸入密碼。' })
  password!: string;
}
