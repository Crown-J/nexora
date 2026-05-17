// apps/nx-api/src/nx02/price-comparison/dto/price-comparison.dto.ts
// NX02 PriceComparison DTO（比價分析查詢）
// 對齊 overview §3.4 + Crown Q12 拍板 3 維度（歷史 + 新品/特價 + 量大彈性折扣）

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PriceComparisonQueryDto {
  /** 歷史均價窗口（天數、default 90、對齊 Crown Q-PS-1=b 90 天範式）。 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  lookbackDays?: number;

  /** 新品/特價窗口（天數、default 30、Qt 採用紀錄較短）。 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(180)
  recentDays?: number;

  /** 過濾廠商（只比較特定廠商歷史、null=全廠商）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string;
}
