// apps/nx-api/src/nx01/user-warehouse/dto/user-warehouse.dto.ts
/**
 * UserWarehouse DTO（補完軌：仿 user-role 範式、解前端 /user-warehouse 404）
 *
 * 路由 root `/user-warehouse`、對齊既有前端 features/base/api/user-warehouse.ts。
 * 2026-06-22 執行長拍板：加 isPrimary / setPrimary（員工可多歸倉、要能指定主要倉）
 */

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** GET /user-warehouse?userId=&warehouseId=&isActive=&page=&pageSize= */
export class ListUserWarehouseQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @Type(() => Boolean)
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

/** POST /user-warehouse */
export class AssignUserWarehouseDto {
  @IsString()
  userId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;
}

/** PATCH /user-warehouse/:id/revoke */
export class RevokeUserWarehouseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/** PATCH /user-warehouse/:id/set-primary */
export class SetPrimaryUserWarehouseDto {
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary!: boolean;
}
