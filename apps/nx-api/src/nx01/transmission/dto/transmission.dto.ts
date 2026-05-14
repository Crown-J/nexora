// apps/nx-api/src/nx01/transmission/dto/transmission.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4.1
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

/** transmissionType: 1=手排 / 2=自排 / 3=雙離合 / 4=CVT / 5=AMT / 6=其他 */
export const TX_TYPE_MIN = 1;
export const TX_TYPE_MAX = 6;

export class ListTransmissionQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TX_TYPE_MIN)
  @Max(TX_TYPE_MAX)
  transmissionType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string;
}

export class CreateTransmissionDto {
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
  nameEn?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(TX_TYPE_MIN)
  @Max(TX_TYPE_MAX)
  transmissionType!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gearCount?: number | null;

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

export class UpdateTransmissionDto {
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
  @IsString()
  @MaxLength(100)
  nameEn?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TX_TYPE_MIN)
  @Max(TX_TYPE_MAX)
  transmissionType?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gearCount?: number | null;

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
