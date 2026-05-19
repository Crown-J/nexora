// apps/nx-api/src/auth/dto/login.dto.ts
// LoginDto：登入請求 body
//
// 2026-04-21 TASK-SEED-REFACTOR-01 Step 4 Migration 2（X1 方案）：
// tenantCode 從選填改為必填 + 加格式驗證，強制所有登入都帶公司帳號
// 以支援多租戶架構（同一 userAccount 可在不同 tenant 共存）。
//
// 2026-05-18 TASK-AUTH-ERROR-CODE：對齊 NEXORA 錯誤代碼規範 v1.1
// message 加 [XX-NNN] 前綴、由 main.ts ValidationPipe exceptionFactory 解析為 NexoraHttpException。
// AU-301 公司空 / AU-302 使用者空 / AU-303 密碼空。

import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: '[AU-301]請輸入公司帳號。' })
  @IsString({ message: '[AU-301]請輸入公司帳號。' })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: '[AU-301]公司帳號格式錯誤（只允許英數字及 -）。',
  })
  @MaxLength(50, { message: '[AU-301]公司帳號格式錯誤（只允許英數字及 -）。' })
  tenantCode!: string;

  @IsNotEmpty({ message: '[AU-302]請輸入使用者帳號。' })
  @IsString({ message: '[AU-302]請輸入使用者帳號。' })
  @MinLength(1, { message: '[AU-302]請輸入使用者帳號。' })
  @MaxLength(50, { message: '[AU-302]請輸入使用者帳號。' })
  username!: string;

  @IsNotEmpty({ message: '[AU-303]請輸入密碼。' })
  @IsString({ message: '[AU-303]請輸入密碼。' })
  @MinLength(6, { message: '[AU-303]請輸入密碼。' })
  @MaxLength(100, { message: '[AU-303]請輸入密碼。' })
  password!: string;
}
