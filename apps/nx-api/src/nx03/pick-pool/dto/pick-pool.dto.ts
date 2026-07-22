// apps/nx-api/src/nx03/pick-pool/dto/pick-pool.dto.ts
// 撿貨池 DTO（SALES-FLOW 階段 1）。撿貨池＝銷貨行工作池、非「新增撿貨單」。

import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** 撿貨池查詢：可選倉別 + 狀態 + 關鍵字。 */
export class PickPoolQueryDto {
  /** 限定倉別（null=全倉）。 */
  @IsOptional()
  @IsString()
  warehouseId?: string;

  /** 池行狀態：W=待撿 / K=撿貨中 / D=已撿完 / M=找不到（空=全部進行中）。 */
  @IsOptional()
  @IsIn(['W', 'K', 'D', 'M'])
  status?: 'W' | 'K' | 'D' | 'M';

  /** 關鍵字（銷貨單號 / 客戶名 / 料號 / 品名）。 */
  @IsOptional()
  @IsString()
  search?: string;
}

/** 開始撿一張銷貨單（其備妥的待撿行整批進撿貨中）。 */
export class StartPickDto {
  @IsString()
  @MinLength(1)
  soId!: string;
}

/** 標記某銷貨行「撿到了」（已撿完）。 */
export class PickLineDto {
  @IsString()
  @MinLength(1)
  soItemId!: string;

  /** 撿貨庫位（選填、記錄實際取貨位）。 */
  @IsOptional()
  @IsString()
  locationId?: string;
}

/** 標記某銷貨行「找不到貨」。 */
export class NotFoundLineDto {
  @IsString()
  @MinLength(1)
  soItemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;
}
