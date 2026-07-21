// apps/nx-api/src/nx03/brand-allocation-rule/dto/brand-allocation-rule.dto.ts
// NX03 BrandAllocationRule DTO（AR 配比規則、modelId 級）
// 對齊 Crown Q-B1=A modelId 級 + Q-S1=A source S/M 雙來源 + Q-M2=A Decimal(5,4)

import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SOURCES = ['S', 'M'] as const; // S=system 自動算 / M=manual 手動覆寫

export class BrandAllocationRuleListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  modelId?: string;

  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateBrandAllocationRuleDto {
  @IsString()
  @MaxLength(15)
  modelId!: string;

  /** OE 採購比例（0.0000~1.0000、與 aftermarketRatio Σ 必 = 1.0、service 自律校驗）。 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  oemRatio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  aftermarketRatio?: number;

  /** S=system 自動算 / M=manual 手動覆寫（預設 S）。 */
  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  /** 生效起期（ISO 8601 date）。 */
  @IsDateString()
  validFrom!: string;

  /** 生效迄期（可空、現役留空、若填必 validFrom < validTo）。 */
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class UpdateBrandAllocationRuleDto {
  /** 不允許改 modelId / validFrom（要改重建）。 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  oemRatio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  aftermarketRatio?: number;

  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
