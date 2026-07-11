// apps/nx-api/src/nx01/part-batch-price/dto/part-batch-price.dto.ts
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具 DTO（preview / apply 共用 payload）

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const PRICE_TARGETS = ['A', 'B', 'C', 'D'] as const;
export type PriceTarget = (typeof PRICE_TARGETS)[number];

export class BatchPriceFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  brandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partGroupId?: string;

  /** 分類一・採購角度（1=保養件…5=油品耗材、對齊 Nx01Part.purchaseCategory） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  purchaseCategory?: number;

  /** 分類二・技術角度（1=引擎動力…9=安全輔助） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  techCategory?: number;

  @IsOptional()
  @IsBoolean()
  isOem?: boolean;

  /** 關鍵字（基準料號 / 品名 / 廠牌料號 contains） */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class BatchPriceAdjustDto {
  /** PCT=百分比（value=5 → +5%）/ AMT=固定額（value=50 → +50 元） */
  @IsIn(['PCT', 'AMT'])
  mode!: 'PCT' | 'AMT';

  /** 調幅（可負=降價；界限 service 依 mode 驗：PCT -90~500、AMT ±100000） */
  @IsNumber()
  value!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(PRICE_TARGETS as unknown as string[], { each: true })
  targets!: PriceTarget[];

  /** INT=四捨五入到整數（台灣售價常態、預設建議）/ NONE=保留 4 位小數 */
  @IsIn(['INT', 'NONE'])
  rounding!: 'INT' | 'NONE';
}

export class BatchPricePayloadDto {
  @ValidateNested()
  @Type(() => BatchPriceFilterDto)
  filter!: BatchPriceFilterDto;

  @ValidateNested()
  @Type(() => BatchPriceAdjustDto)
  adjust!: BatchPriceAdjustDto;

  /** 完全沒設任何 filter（=全庫調價）時必須明示 true（防手滑） */
  @IsOptional()
  @IsBoolean()
  confirmAll?: boolean;
}
