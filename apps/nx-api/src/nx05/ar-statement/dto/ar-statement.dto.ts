// apps/nx-api/src/nx05/ar-statement/dto/ar-statement.dto.ts
// NX05 ArStatement DTO（月底自動對帳單查詢）
// 對齊 overview §6.3 + Crown Q3 + Q7=a

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ArStatementQueryDto {
  /** 統計年份。 */
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  /** 統計月份 1~12。 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
