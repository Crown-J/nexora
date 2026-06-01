// apps/nx-api/src/nx02/demand/dto/demand.dto.ts
// v1.2 階段 I P3：採購需求 manual + 操作 DTO
//
// 對齊：
//   - schema Nx02Demand 既有 demandType S/O / status O/P/C/I
//   - Alex Q2=a 銷貨缺貨自動由 helper 寫、手動由本 controller POST 寫

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DEMAND_TYPES = ['S', 'O'] as const;
const DEMAND_STATUSES = ['O', 'P', 'C', 'I'] as const;

export class ListDemandQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
  @IsOptional() @IsString() @MaxLength(15) warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(15) partId?: string;
  @IsOptional() @IsString() @IsIn(DEMAND_TYPES as unknown as string[]) demandType?: 'S' | 'O';
  @IsOptional() @IsString() @IsIn(DEMAND_STATUSES as unknown as string[]) status?: 'O' | 'P' | 'C' | 'I';
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

/**
 * 手動新增採購需求（Alex Q2=a + 階段 I P3）。
 * - demandType 預設 'O' 客訂（手動建單一般是業務代客戶提出）
 * - 若是「不指定客戶的補貨需求」可填 demandType='S'
 */
export class CreateDemandDto {
  @IsOptional()
  @IsString()
  @IsIn(DEMAND_TYPES as unknown as string[])
  demandType?: 'S' | 'O';

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  warehouseId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qty!: number;

  /** demandType='O' 必填、'S' 可空（service 自律） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerId?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

/**
 * 業務員忽略某筆需求（status O/P → I）。
 * 對齊 schema：status='I' 時 ignoreReason 必填。
 */
export class IgnoreDemandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ignoreReason!: string;
}
