// apps/nx-api/src/nx01/brand/dto/brand.dto.ts
// W6 [3-8] 2026-06-06 品牌合併（合 PartBrand + CarBrand → Brand、雙開關 isCar / isPart）
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListBrandQueryDto extends Nx01ListQueryDto {
  /** 只列 isCar=true 的品牌（車型字典 / Engine / Transmission / Model / VinLookup picker 用）*/
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCar?: boolean;

  /** 只列 isPart=true 的品牌（零件主檔 / BrandCodeRule / StItem picker 用）*/
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPart?: boolean;
}

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  /** W6 雙開關：同 code 可同時是車牌 + 零件廠牌（業界 VAG 範式）*/
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCar?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPart?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCar?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPart?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
