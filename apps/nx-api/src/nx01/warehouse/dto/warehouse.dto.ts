import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListWarehouseQueryDto extends Nx01ListQueryDto {}

// v1.2 階段 E P4：warehouse 結構化地址 + isMain + managerUserId（schema 既有、DTO 補對齊）
class WarehouseCommonDto {
  @IsOptional() @Transform(toBoolean) @IsBoolean() isMain?: boolean;
  @IsOptional() @IsString() @MaxLength(15) managerUserId?: string | null;
  // 結構化地址（basic + delivery 視角共用）
  @IsOptional() @IsString() @MaxLength(15) cityId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) districtId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) streetId?: string | null;
  // schema lane/alley/buildingNo/buildingSubNo 是 Int!（純數字）
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99999) lane?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99999) alley?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99999) buildingNo?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(9999) buildingSubNo?: number | null;
  @IsOptional() @IsString() @MaxLength(10) floor?: string | null;
  @IsOptional() @IsString() @MaxLength(10) roomNo?: string | null;
}

export class CreateWarehouseDto extends WarehouseCommonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  siteId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWarehouseDto extends WarehouseCommonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseTypeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  siteId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
