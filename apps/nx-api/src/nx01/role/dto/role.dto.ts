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

export class ListRoleQueryDto extends Nx01ListQueryDto {
  // 2026-06-24：OrgStructurePage 四欄 cascade 需要依組別 / 部門過濾職務
  @IsOptional() @IsString() @MaxLength(15) teamId?: string;
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string;
}

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
  @IsOptional() @IsString() @MaxLength(20) level?: string;
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string;

  // 2026-06-24：隸屬組別（業務職務必填、isSystem=true 系統角色豁免、service 層 validate）
  @IsOptional() @IsString() @MaxLength(15) teamId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
  @IsOptional() @IsString() @MaxLength(20) level?: string | null;
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string | null;

  // 2026-06-24：隸屬組別（業務職務必填、isSystem=true 系統角色豁免）
  @IsOptional() @IsString() @MaxLength(15) teamId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
