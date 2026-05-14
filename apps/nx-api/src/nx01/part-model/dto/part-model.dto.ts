// apps/nx-api/src/nx01/part-model/dto/part-model.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0
// fitLevel SmallInt enum（Q3=B 拍板：1=原廠 / 2=副廠等效 / 3=通用替代）
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

/** fitLevel：1=原廠 / 2=副廠等效 / 3=通用替代（規格 §3.3） */
export const FIT_LEVEL_MIN = 1;
export const FIT_LEVEL_MAX = 3;

export class ListPartModelQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  modelId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(FIT_LEVEL_MIN)
  @Max(FIT_LEVEL_MAX)
  fitLevel?: number;
}

export class CreatePartModelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  modelId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(FIT_LEVEL_MIN)
  @Max(FIT_LEVEL_MAX)
  fitLevel!: number;

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

export class UpdatePartModelDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(FIT_LEVEL_MIN)
  @Max(FIT_LEVEL_MAX)
  fitLevel?: number;

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
