// apps/nx-api/src/nx04/bundle/dto/bundle.dto.ts
// F2 組合套餐 2026-06-09：DTO

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Nx04ListQueryDto } from '../../../shared/nx04/nx04-list-query.dto';

export class ListBundleQueryDto extends Nx04ListQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBundleItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumberString({ no_symbols: false })
  qty!: string;
}

export class CreateBundleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumberString({ no_symbols: false })
  bundlePrice!: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items!: CreateBundleItemDto[];
}

export class UpdateBundleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: false })
  bundlePrice?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/** 整批取代套餐組成（同 promotion replaceScopes 範式） */
export class ReplaceBundleItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items!: CreateBundleItemDto[];
}

/** 套用套餐到 SO（NX04 SO 開單時呼叫） */
export class ApplyBundleToSoDto {
  @IsString()
  @MaxLength(15)
  bundleId!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;
}
