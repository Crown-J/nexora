// apps/nx-api/src/nx01/role-view/dto/role-view.dto.ts
/**
 * RoleView DTO（補後端軌：職務↔畫面權限指派 join 表）
 * 路由 nx01/role-views；停用走 @Delete soft（isActive=false + revokedAt）。
 */

import { Transform } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListRoleViewQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  viewId?: string;
}

export class CreateRoleViewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  roleId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  viewId!: string;

  @IsOptional() @Transform(toBoolean) @IsBoolean() canRead?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canCreate?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canUpdate?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canDelete?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canExport?: boolean;
  // T1-fix-b 2026-06-07：核准權限第 6 欄（schema 已 預埋）。對採購單/保固/盤點等審核流程畫面有意義、其餘 N/A 不勾。
  @IsOptional() @Transform(toBoolean) @IsBoolean() canApprove?: boolean;
}

export class UpdateRoleViewDto {
  @IsOptional() @Transform(toBoolean) @IsBoolean() canRead?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canCreate?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canUpdate?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canDelete?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() canExport?: boolean;
  // T1-fix-b 2026-06-07：核准權限第 6 欄
  @IsOptional() @Transform(toBoolean) @IsBoolean() canApprove?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;
}
