// apps/nx-api/src/nx03/pl/dto/pl.dto.ts
// NX03 Pl DTO（包貨單、從 Pk 自動轉 items、不獨立新增 line）
// 對齊 overview §5.3 包貨單 = 1 對 N 包裹拆分

import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const PL_TYPES = ['D', 'P', 'C', 'T'] as const; // D=配送 / P=自取 / C=寄貨 / T=調撥

export class CreatePlDto {
  /** 來源撿貨單 ID（必填、Pk 須 status=F 已完成）。 */
  @IsString()
  @MaxLength(15)
  pkId!: string;

  @IsDateString()
  plDate!: string;

  /** D/P/C/T、業務上應對齊 Pk.deliveryType（service 校驗）。 */
  @IsString()
  @IsIn(PL_TYPES as unknown as string[])
  plType!: 'D' | 'P' | 'C' | 'T';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class UpdatePlDto {
  @IsOptional()
  @IsDateString()
  plDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** P=待包貨 / C=包貨中 / F=已完成 / S=已寄出 / V=作廢。 */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;

  /** 寄貨第三方物流業者（status=S 或寄貨流程）。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  logisticsProvider?: string;

  /** 寄貨追蹤號碼。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  logisticsTrackingNo?: string;
}

export class PatchPlItemDto {
  /** 包裹分配（commit 6 Parcel 階段填）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  parcelId?: string;

  /** 微調包裝數量（≤ pkItem 撿到數量、application 自律）。 */
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
