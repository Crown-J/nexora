// apps/nx-api/src/nx01/part-group/dto/part-group.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0 (part_group 子段)
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListPartGroupQueryDto extends Nx01ListQueryDto {}

export class CreatePartGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  // 02 第四批 軌 6 2026-06-07：預設建議保存期限（月、選填、可為 0/1+）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  defaultShelfLifeMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePartGroupDto {
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

  // 02 第四批 軌 6 2026-06-07：預設建議保存期限（月、null 可清除、業務員手動清空時送 null）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  defaultShelfLifeMonths?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
