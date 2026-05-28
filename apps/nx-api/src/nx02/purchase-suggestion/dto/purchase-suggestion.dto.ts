// apps/nx-api/src/nx02/purchase-suggestion/dto/purchase-suggestion.dto.ts
// NX02 PurchaseSuggestion DTO（採購建議單列表查詢）
// 對齊 Crown Q20 列表式 + Q11/Q17 客訂優先 + Q-PP-1=C 混合範式

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const DEMAND_TYPES = ['S', 'O'] as const; // S=AR 庫存不足 / O=客訂

export class PurchaseSuggestionListQueryDto {
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

  /** 過濾倉庫（可空、null=所有倉）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  /** 過濾廠商 ID（partner_type='S' 純供應商、混合範式：先查 PartnerPart 主檔 → fallback 歷史 PoItem 90 天）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string;

  /** 過濾需求類型（S=AR / O=客訂、null=兩者皆顯示）。 */
  @IsOptional()
  @IsString()
  @IsIn(DEMAND_TYPES as unknown as string[])
  demandType?: 'S' | 'O';

  /** 搜尋（partNo / partName / docNo）。 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
