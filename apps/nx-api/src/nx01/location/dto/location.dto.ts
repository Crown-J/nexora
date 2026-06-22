// apps/nx-api/src/nx01/location/dto/location.dto.ts
/**
 * Location（據點 / 倉內庫位）DTO — 補後端軌（仿 warehouse、加 warehouseId 外鍵）
 * 路由 nx01/locations、停用走 @Delete soft（系統不刪資料）。
 */

import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListLocationQueryDto extends Nx01ListQueryDto {}

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  siteId?: string;

  /** 2026-06-22 執行長拍板新增四層架構 site→warehouse→zone→location */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  zoneId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rack?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  levelNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  binNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  siteId?: string | null;

  /** 2026-06-22 執行長拍板新增四層架構 site→warehouse→zone→location */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  zoneId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rack?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  levelNo?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  binNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
