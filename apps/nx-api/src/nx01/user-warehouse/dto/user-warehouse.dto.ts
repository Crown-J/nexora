// apps/nx-api/src/nx01/user-warehouse/dto/user-warehouse.dto.ts
/**
 * UserWarehouse DTO（補完軌：仿 user-role 範式、解前端 /user-warehouse 404）
 *
 * 路由 root `/user-warehouse`、對齊既有前端 features/base/api/user-warehouse.ts。
 * 與 user-role 差異：無 isPrimary / setPrimary（倉庫無「主要」概念）。
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
}

/** PATCH /user-warehouse/:id/revoke */
export class RevokeUserWarehouseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
