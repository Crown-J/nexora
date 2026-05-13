// apps/nx-api/src/nx01/engine/dto/engine.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-14-engine.md v1.0 §4
import { Type } from 'class-transformer';
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

/** fuelType: 1=汽油 / 2=柴油 / 3=Hybrid / 4=EV（Crown 拍 Q1=C） */
export const FUEL_TYPE_MIN = 1;
export const FUEL_TYPE_MAX = 4;

/** aspirationType: 1=NA / 2=TC / 3=SC / 4=TC+SC（Crown 拍 Q2=A） */
export const ASPIRATION_TYPE_MIN = 1;
export const ASPIRATION_TYPE_MAX = 4;

export class ListEngineQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(FUEL_TYPE_MIN)
  @Max(FUEL_TYPE_MAX)
  fuelType?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ASPIRATION_TYPE_MIN)
  @Max(ASPIRATION_TYPE_MAX)
  aspirationType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string;
}

export class CreateEngineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displacementCc?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cylinderConfig?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(FUEL_TYPE_MIN)
  @Max(FUEL_TYPE_MAX)
  fuelType!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ASPIRATION_TYPE_MIN)
  @Max(ASPIRATION_TYPE_MAX)
  aspirationType?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string | null;

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

export class UpdateEngineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displacementCc?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cylinderConfig?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(FUEL_TYPE_MIN)
  @Max(FUEL_TYPE_MAX)
  fuelType?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ASPIRATION_TYPE_MIN)
  @Max(ASPIRATION_TYPE_MAX)
  aspirationType?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string | null;

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
