// apps/nx-api/src/nx03/pick-pool/dto/pick-pool.dto.ts
// 撿貨清單 DTO（SALES-FLOW 撿貨重設計 2026-07-22）。庫位軸、同料件合併總量。

import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** 撿貨清單查詢：可選倉別 + 關鍵字。 */
export class PickListQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  /** 關鍵字（料號 / 品名 / 庫位）。 */
  @IsOptional()
  @IsString()
  search?: string;
}

/** 撿到了：把某（倉 × 料件）的所有待撿行整批標為已撿。 */
export class PickAggregateDto {
  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @IsString()
  @MinLength(1)
  partId!: string;
}

/**
 * 撿貨異常：開正式異常回報單（接六處置流程）。
 * issueType：D=損毀 / S=數量短缺（撿貨現場常見兩種）。
 */
export class ReportPickIssueDto {
  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @IsString()
  @MinLength(1)
  partId!: string;

  @IsIn(['D', 'S'])
  issueType!: 'D' | 'S';

  /** 異常數量（損毀幾個 / 短缺幾個）。 */
  @IsNumber()
  @Min(0.0001)
  qty!: number;

  /** 異常說明（選填）。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
