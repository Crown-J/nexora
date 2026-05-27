// apps/nx-api/src/nx01/site/dto/site.dto.ts
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListSiteQueryDto extends Nx01ListQueryDto {}

export class CreateSiteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  districtId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  streetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cityId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  districtId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  streetId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
