// apps/nx-api/src/nx01/warehouse-zone/dto/warehouse-zone.dto.ts
// 倉庫分區 DTO（2026-06-22 執行長拍板新增四層架構）
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

export class ListWarehouseZoneQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;
}

export class CreateWarehouseZoneDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

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

export class UpdateWarehouseZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

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
