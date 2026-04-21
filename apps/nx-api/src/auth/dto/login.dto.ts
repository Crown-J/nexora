// apps/nx-api/src/auth/dto/login.dto.ts
// LoginDto：登入請求 body
//
// 2026-04-21 TASK-SEED-REFACTOR-01 Step 4 Migration 2（X1 方案）：
// tenantCode 從選填改為必填 + 加格式驗證，強制所有登入都帶公司帳號
// 以支援多租戶架構（同一 userAccount 可在不同 tenant 共存）。

import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: '請輸入公司帳號' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: '公司帳號格式錯誤（只允許英數字與 -）',
  })
  @MaxLength(50)
  tenantCode!: string;

  @IsNotEmpty({ message: '請輸入使用者帳號' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  username!: string;

  @IsNotEmpty({ message: '請輸入密碼' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}
