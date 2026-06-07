// apps/nx-api/src/nx01/team/dto/team.dto.ts
// 05 批 T2 2026-06-07：組主檔 DTO（揭露既有 Nx01Team schema、不動 schema）
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListTeamQueryDto extends Nx01ListQueryDto {
  /** 依部門過濾（picker / 員工帳號權限 zone 用） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  departmentId?: string;

  /** 依上層組過濾（子組樹形渲染用） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  parentTeamId?: string;
}

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  /** 隸屬部門（必填、core schema 已 NOT NULL） */
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  departmentId!: string;

  /** 上層組（選填、支援子組；自我 ref nx01_team.parent_team_id） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  parentTeamId?: string;

  /** 倉管組可掛倉庫（選填、後續軌用） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTeamDto {
  // code 建立後不可改、UpdateDto 不收

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  parentTeamId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
