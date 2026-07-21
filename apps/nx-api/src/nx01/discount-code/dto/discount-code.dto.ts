// apps/nx-api/src/nx01/discount-code/dto/discount-code.dto.ts
// F1-A 銷貨優惠價子系統 2026-06-08：折扣代碼主檔 DTO
// schema Nx01DiscountCode（既有）：code/name/discountType(P=率/A=金額)/discountValue/managedBy(P=採購組長/S=銷售組長)/remark/isActive

import { Transform } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

const DISCOUNT_TYPES = ['P', 'A'] as const; // P=率%/A=金額
const MANAGED_BY = ['P', 'S'] as const; // P=採購組長/S=銷售組長

export class ListDiscountCodeQueryDto extends Nx01ListQueryDto {}

export class CreateDiscountCodeDto {
  /** 折扣代碼（租戶內唯一）、例：DEFECT/USED/VIP/BULK */
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  /** 折扣名稱（顯示用） */
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  /** 折扣方式 P=率%/A=金額 */
  @IsString()
  @IsIn(DISCOUNT_TYPES as unknown as string[])
  discountType!: 'P' | 'A';

  /** 折扣值（P 時為百分比、A 時為固定金額）、Decimal(10,2) */
  @IsNumberString({ no_symbols: false })
  discountValue!: string;

  /** 管理角色 P=採購組長/S=銷售組長（預設 P） */
  @IsOptional()
  @IsString()
  @IsIn(MANAGED_BY as unknown as string[])
  managedBy?: 'P' | 'S';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountCodeDto {
  /** 不允許改 code（業務語意：code 是唯一識別、改要重建） */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(DISCOUNT_TYPES as unknown as string[])
  discountType?: 'P' | 'A';

  @IsOptional()
  @IsNumberString({ no_symbols: false })
  discountValue?: string;

  @IsOptional()
  @IsString()
  @IsIn(MANAGED_BY as unknown as string[])
  managedBy?: 'P' | 'S';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
