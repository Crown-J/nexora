// apps/nx-api/src/nx04/sales-performance/dto/sales-performance.dto.ts
// NX04 SalesPerformance DTO（LITE/PLUS 業績查詢）
// 對齊 overview §5.1 LITE/PLUS 範圍（毛利顯示 + 手動目標）
// PRO 完整 KPI 留範圍 B 戰略軌

import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SalesPerformanceQueryDto {
  /** 業務員 ID（FK nx01_user、null=當前 user）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;

  /** 統計年份（如 2026）。 */
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  /** 統計月份（1~12、null=整年彙總）。 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /** 業務員手動目標金額（純對比、不儲存）。 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  target?: number;
}
