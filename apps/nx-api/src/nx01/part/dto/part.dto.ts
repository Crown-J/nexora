import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

const RETURN_POLICIES = ['F', 'S', 'R', 'N', 'W'] as const;

/**
 * 軸 1：part.type 升 SmallInt（1=專用 / 2=通用 / 3=組合 / 4=拆解）
 * 對齊 NX01-14 fuelType / NX01-15 transmissionType SmallInt 範式
 */
const PART_TYPE_MIN = 1;
const PART_TYPE_MAX = 4;

export class ListPartQueryDto extends Nx01ListQueryDto {}

/**
 * Crown Q7=B：part.code 預覽 DTO
 * 前端 onChange 即時呼叫 POST /nx01/parts/preview-code、回 { code: string }
 */
export class PreviewPartCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  codeRuleId!: string;

  @IsOptional() @IsString() @MaxLength(10) seg1?: string;
  @IsOptional() @IsString() @MaxLength(10) seg2?: string;
  @IsOptional() @IsString() @MaxLength(10) seg3?: string;
  @IsOptional() @IsString() @MaxLength(10) seg4?: string;
  @IsOptional() @IsString() @MaxLength(10) seg5?: string;

  @IsOptional() @IsString() @MaxLength(15) partBrandId?: string;
  @IsOptional() @IsString() @MaxLength(15) countryId?: string;
}

export class CreatePartDto {
  /**
   * 規格 §3 + Crown Q5=A 拍板：codeRuleId 必填（業務先建 brand_code_rule、再建 part）
   * @IsOptional 保 DTO 形式相容、但 service 強制檢核（非空檢查 + verify 存在）
   */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  codeRuleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  secCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg5?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partGroupId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PART_TYPE_MIN)
  @Max(PART_TYPE_MAX)
  partType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  uom?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  @IsIn(RETURN_POLICIES)
  returnPolicy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceB?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceD?: number;
}

export class UpdatePartDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  secCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg1?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg3?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg4?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg5?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partGroupId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PART_TYPE_MIN)
  @Max(PART_TYPE_MAX)
  partType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  uom?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  @IsIn(RETURN_POLICIES)
  returnPolicy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceB?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceD?: number;
}
