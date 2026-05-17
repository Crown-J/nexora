// apps/nx-api/src/nx04/co-estimate/dto/co-estimate.dto.ts
// NX04 CoEstimate DTO（客訂預估價查詢）
// 對齊 overview §9 客訂預估價（Crown Q-NX04-C=B 系統算）

import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class EstimatePriceDto {
  /** 客戶 ID（FK nx01_partner partner_type='C'、取 customerGrade.marginPct）。 */
  @IsString()
  @MaxLength(15)
  customerId!: string;

  /** 料件 ID（FK nx01_part、查歷史成本 + fallback priceA~D）。 */
  @IsString()
  @MaxLength(15)
  partId!: string;

  /** 數量（純 totalEstimate 計算、不影響單價）。 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty?: number;

  /** 歷史成本窗口（天數、default 90、對齊 NX02 範式）。 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  lookbackDays?: number;
}
