// apps/nx-api/src/nx01/brand-code-rule/dto/brand-code-rule.dto.ts
// 下半場 A：partBrandId + SEG1~5 字數（拿掉 JSON segDefinitions / segCount / sourceCodePrefix）。
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListBrandCodeRuleQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string;
}

export class CreateBrandCodeRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partBrandId!: string;

  /** W6-切換軌：新 brandId（dual-write 過渡期、未送 service 端 lookup partBrandId 對應） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  brandId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg1Length!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg2Length!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg3Length!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  seg4Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  seg5Length?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg1Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg2Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seg3Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  seg4Length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  seg5Length?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
