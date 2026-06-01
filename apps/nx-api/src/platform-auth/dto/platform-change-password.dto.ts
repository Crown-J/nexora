// apps/nx-api/src/platform-auth/dto/platform-change-password.dto.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台超管改密碼 DTO
//
// 首次登入（mustChangePassword=true）oldPassword 可省（service 端判斷允許跳驗證）

import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PlatformChangePasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  oldPassword?: string;

  @IsNotEmpty({ message: '[PL-303]請輸入新密碼。' })
  @IsString({ message: '[PL-303]請輸入新密碼。' })
  @MinLength(6, { message: '[PL-303]新密碼至少 6 字元。' })
  @MaxLength(100)
  newPassword!: string;
}
