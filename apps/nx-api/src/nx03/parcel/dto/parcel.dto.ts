// apps/nx-api/src/nx03/parcel/dto/parcel.dto.ts
// NX03 Parcel DTO（包裹、三選一分流校驗）
// 對齊 overview §5.4 自取(P) / 寄貨(C) / 配送(D) / 調撥(T)

import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const PARCEL_TYPES = ['D', 'P', 'C', 'T'] as const;

export class CreateParcelDto {
  /** 來源包貨單（必填、Pl 須 status=F 或 C）。 */
  @IsString()
  @MaxLength(15)
  plId!: string;

  /** D=配送 / P=自取 / C=寄貨 / T=調撥。 */
  @IsString()
  @IsIn(PARCEL_TYPES as unknown as string[])
  parcelType!: 'D' | 'P' | 'C' | 'T';

  /** 目標倉庫（調撥 T 必填、其他必空、service 自律）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  toWarehouseId?: string;

  /** 收貨對象（寄貨 C 必填 partner_type=T 物流外包；配送 D 可選；自取 P/調撥 T 必空、service 自律）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  toPartnerId?: string;

  /** 第三方物流單號（寄貨 C 用）。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  logisticsTrackingNo?: string;

  /** 包裹重量（公斤、選填）。 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class UpdateParcelDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  logisticsTrackingNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
