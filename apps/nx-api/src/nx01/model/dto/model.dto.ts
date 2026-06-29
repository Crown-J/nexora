// apps/nx-api/src/nx01/model/dto/model.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-13-model.md v1.0 §4
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

const YEAR_MIN = 1900;
const YEAR_MAX_FUTURE = 2100; // class-validator 限上限、service 做 ≤ 當前年+5 精確檢核

export class ListModelQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(YEAR_MIN)
  @Max(YEAR_MAX_FUTURE)
  modelYearFrom?: number;
}

export class CreateModelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  carBrandId!: string;

  // 2026-06-29 改選填：起始年份可空（恆迎匯入有車型無明確起始年）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(YEAR_MIN)
  @Max(YEAR_MAX_FUTURE)
  modelYearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(YEAR_MIN)
  @Max(YEAR_MAX_FUTURE)
  modelYearTo?: number | null;

  // 2026-06-26：取消引擎等外鍵、改自由輸入
  @IsOptional()
  @IsString()
  @MaxLength(30)
  engineCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displacementCc?: number | null;

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

export class UpdateModelDto {
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
  @MinLength(1)
  @MaxLength(15)
  carBrandId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(YEAR_MIN)
  @Max(YEAR_MAX_FUTURE)
  modelYearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(YEAR_MIN)
  @Max(YEAR_MAX_FUTURE)
  modelYearTo?: number | null;

  // 2026-06-26：取消引擎等外鍵、改自由輸入
  @IsOptional()
  @IsString()
  @MaxLength(30)
  engineCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displacementCc?: number | null;

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
