// apps/nx-api/src/nx05/account-code/dto/account-code.dto.ts
// NX05 AccountCode DTO（會計科目主檔 CRUD）

import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 科目類別（I 收入/E 支出/A 資產/L 負債）。對齊 schema nx05_account_code.category。 */
const CATEGORIES = ['I', 'E', 'A', 'L'] as const;

export class AccountCodeListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @IsIn(CATEGORIES as unknown as string[])
  category?: 'I' | 'E' | 'A' | 'L';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateAccountCodeDto {
  @IsString()
  @MaxLength(10)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(CATEGORIES as unknown as string[])
  category!: 'I' | 'E' | 'A' | 'L';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class UpdateAccountCodeDto {
  /** 不允許改 code / category（要改重建）。is_system=true 的科目允許改 name + remark + isActive。 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
