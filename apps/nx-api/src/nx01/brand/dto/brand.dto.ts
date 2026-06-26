// apps/nx-api/src/nx01/brand/dto/brand.dto.ts
// W6 [3-8] 2026-06-06 品牌合併（合 PartBrand + CarBrand → Brand、雙開關 isCar / isPart）
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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

  /** 只列 isPart=true 的品牌（零件主檔 / StItem picker 用）*/
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPart?: boolean;
}

export class CreateBrandDto {
  // 02 第四批 軌 4 2026-06-07：品牌代碼固定 3 碼大寫英文（業界縮寫範式、總經理拍板）。
  // @Transform 在 validator 前先 trim + uppercase、@Matches 強制 ^[A-Z]{3}$。
  // 老資料不動（service 不回填、UpdateBrandDto 不收 code、lockedOnEdit）。
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3, { message: '品牌代碼必須 3 碼' })
  @MaxLength(3, { message: '品牌代碼必須 3 碼' })
  @Matches(/^[A-Z]{3}$/, { message: '品牌代碼必須是 3 碼大寫英文（A-Z）' })
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
