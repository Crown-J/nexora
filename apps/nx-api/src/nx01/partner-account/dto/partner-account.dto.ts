// apps/nx-api/src/nx01/partner-account/dto/partner-account.dto.ts
// 往來帳戶 CRUD DTO（帳戶閘門規格 v1.3 Step 3a、2026-07-21）
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { toBoolean } from '../../../shared/dto/to-boolean';

export class OpenPartnerAccountDto {
  /** R=收款帳戶（統編必填）/ P=進貨付款帳戶（銀行組必填、採購權限）/ T=調貨付款帳戶（輕量） */
  @IsString()
  @IsIn(['R', 'P', 'T'])
  direction!: string;

  /** R 戶：統編（partner.taxId 已有可省略；提供則回寫 partner） */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  /** 外籍／特殊統編：true 跳過台灣 8 碼檢核（拍板 五-6 後門） */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  foreignTaxId?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountHolder?: string;
}

export class PatchPartnerAccountDto {
  /** A=啟用 / S=停用 */
  @IsOptional()
  @IsString()
  @IsIn(['A', 'S'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountHolder?: string;
}
