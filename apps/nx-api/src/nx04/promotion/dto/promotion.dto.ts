// apps/nx-api/src/nx04/promotion/dto/promotion.dto.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 DTO
//
// scopeType: P=part 指定料件 / B=brand 品牌 / G=partGroup 料件族群（Alex Q1 拍板 3 種、車型留汽車資料庫套件）

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Nx04ListQueryDto } from '../../../shared/nx04/nx04-list-query.dto';

const SCOPE_TYPES = ['P', 'B', 'G'] as const;

export class ListPromotionQueryDto extends Nx04ListQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isClearance?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePromotionScopeDto {
  /** P=part / B=brand / G=partGroup */
  @IsString()
  @IsIn(SCOPE_TYPES as unknown as string[])
  scopeType!: 'P' | 'B' | 'G';

  @IsString()
  @MaxLength(15)
  scopeId!: string;
}

export class CreatePromotionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** 純絕對單價（Alex Q2、Decimal(14,4)、string 避 JS number 精度） */
  @IsNumberString({ no_symbols: false })
  priceOverride!: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isClearance?: boolean;

  /** 批量買 N 件條件、null = 無限制 */
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  minBuyQty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 範圍至少一筆（partId/brandId/partGroupId 多選） */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePromotionScopeDto)
  scopes!: CreatePromotionScopeDto[];
}

export class UpdatePromotionDto {
  /** 不允許改 code（唯一識別、改要重建） */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: false })
  priceOverride?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isClearance?: boolean;

  @IsOptional()
  @IsNumberString({ no_symbols: false })
  minBuyQty?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/** 範圍 patch（取代全部 scopes、最簡介面、UI 整批改交易性高） */
export class ReplacePromotionScopesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePromotionScopeDto)
  scopes!: CreatePromotionScopeDto[];
}
