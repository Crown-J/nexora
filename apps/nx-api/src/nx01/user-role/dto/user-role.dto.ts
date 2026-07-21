// apps/nx-api/src/nx01/user-role/dto/user-role.dto.ts
/**
 * UserRole DTO（業界改革 #22 v1.2、解前端 /user-role 404）
 *
 * 註：路由保留 root `/user-role`（不加 nx01/ 前綴）對齊既有前端
 * features/base/api/user-role.ts + features/shared/master/user-role/api/user-role.ts。
 * 後續軌 TASK-API-NAMESPACE-NORMALIZE 統一所有 nx01 entity 路由前綴。
 */

import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** GET /user-role?userId=&roleId=&isActive=&page=&pageSize= */
export class ListUserRoleQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** POST /user-role */
export class AssignUserRoleDto {
  @IsString()
  userId!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;
}

/** PATCH /user-role/:id/revoke */
export class RevokeUserRoleDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/** PATCH /user-role/:id/primary */
export class SetPrimaryDto {
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary!: boolean;
}

/** PATCH /user-role/:id/active */
export class SetActiveDto {
  @Transform(toBoolean)
  @IsBoolean()
  isActive!: boolean;
}
