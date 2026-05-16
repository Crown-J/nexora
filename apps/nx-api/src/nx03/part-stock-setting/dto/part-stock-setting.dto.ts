// apps/nx-api/src/nx03/part-stock-setting/dto/part-stock-setting.dto.ts
// NX03 PartStockSetting DTO（料件 × 倉 安全量 / 最高量 / 補貨點）
// 對齊 AUDIT-03 業務語意 + overview §3.3 #12 自動補貨偵測基礎（範圍 A 涵蓋 setting、補貨建議單在 B 軌）

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 列表查詢：分頁 + 倉 / 料件 / 啟用 / 搜尋（料號／品名 join 透過 service 層）。 */
export class PartStockSettingListQueryDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 料號 / 品名 contains 搜尋（service 層 join nx01_part 篩）。 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** 新增：partId + warehouseId 必填、安全量 / 最高量 / 補貨點 0 default。 */
export class CreatePartStockSettingDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderQty?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

/** 更新：不允許改 partId/warehouseId（要改請重建）。 */
export class UpdatePartStockSettingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderQty?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
