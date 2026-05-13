// apps/nx-api/src/nx01/brand-code-rule/dto/brand-code-rule.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-11-brand-code-rule.md v1.0 §4
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class SegDefinitionDto {
  @IsInt()
  @Min(1)
  @Max(10)
  seg_no!: number;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  length_min!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  length_max!: number;

  @IsString()
  /** numeric / alpha / alphanumeric / any（規格 §4.2 charset 枚舉） */
  charset!: string;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class ListBrandCodeRuleQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  carBrandId?: string;
}

export class CreateBrandCodeRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  carBrandId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsInt()
  @Min(1)
  @Max(10)
  segCount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegDefinitionDto)
  segDefinitions!: SegDefinitionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1)
  separator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  sourceCodePrefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  examplePartCode?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandCodeRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  segCount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegDefinitionDto)
  segDefinitions?: SegDefinitionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1)
  separator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  sourceCodePrefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  examplePartCode?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
