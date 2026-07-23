// apps/nx-api/src/nx03/pick-pool/dto/pick-pool.dto.ts
// 撿貨清單 DTO（SALES-FLOW 撿貨重設計 2026-07-22）。庫位軸、同料件合併總量、支援部分撿。

import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** 撿貨清單查詢：可選倉別 + 關鍵字。 */
export class PickListQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  /** 關鍵字（料號 / 品名 / 廠牌）。 */
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * 撿取：某（倉 × 料件）撿 qty 個。
 * qty 省略＝全部撿取（撿滿剩餘量）；帶 qty＝部分撿取（可少於剩餘、FIFO 分配到各單）。
 */
export class PickAggregateDto {
  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @IsString()
  @MinLength(1)
  partId!: string;

  /** 撿取數量（省略=全部撿取）。 */
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;
}

/**
 * 撿貨異常：對「還沒撿到的剩餘量」開正式異常回報單（接六處置流程）。
 * issueType：D=損毀 / S=數量短缺。qty 由後端自動＝剩餘量（不用倉管填）。
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

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** 重置數量：把某（倉 × 料件）已撿量歸零（反寫、供重撿）。 */
export class ResetPickDto {
  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @IsString()
  @MinLength(1)
  partId!: string;
}

/** 已撿貨／已取消清單查詢（WMS P2 中欄/右欄）：可選倉別 + 關鍵字。 */
export class StagedListQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/** 中欄「取消撿貨」/右欄「已放回」：對某（單 × 料件）操作（誤按修正 / 訂單取消歸位）。 */
export class StagedActionDto {
  @IsString()
  @MinLength(1)
  soId!: string;

  @IsString()
  @MinLength(1)
  partId!: string;

  @IsString()
  @MinLength(1)
  warehouseId!: string;
}

/** 中/右欄「異常回報」：對某（單 × 料件）的已撿/待放回貨開異常回報單（接六處置）。 */
export class StagedIssueDto extends StagedActionDto {
  @IsIn(['D', 'S'])
  issueType!: 'D' | 'S';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
