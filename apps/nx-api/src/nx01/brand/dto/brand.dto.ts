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
  // 2026-06-29 放寬（總經理改拍板）：拿掉固定 3 碼限制、改 1-30 碼大寫英數+連字號。
  // @Transform 先 trim + uppercase、@Matches 強制 ^[A-Z0-9-]+$（長度 1-30）。
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Z0-9-]+$/, { message: '品牌代碼只能是大寫英文、數字、連字號（-）' })
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
  // 2026-06-29 改可編輯（總經理改拍板）：解除 lockedOnEdit、code 可改。
  // service.update 會在 code 異動時補 tenant 內唯一性檢查（排除自己）。
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Z0-9-]+$/, { message: '品牌代碼只能是大寫英文、數字、連字號（-）' })
  code?: string;

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
