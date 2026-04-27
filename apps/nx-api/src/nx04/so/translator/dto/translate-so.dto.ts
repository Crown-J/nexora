// apps/nx-api/src/nx04/so/translator/dto/translate-so.dto.ts
// D4 翻譯器 DTO — 對應 D4 意圖版 §4.1 / D4-impl §3.6
// 業務在 W2 工作台送出時的請求 + 翻譯成功的回傳結構

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export type TransferSourceType = 'S' | 'T' | 'G' | 'B';

export class TranslateLineItemDto {
  @IsString()
  @Length(15, 15)
  partId!: string;

  @IsString()
  @Length(15, 15)
  warehouseId!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qty!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice!: number;

  @IsIn(['S', 'T', 'G', 'B'])
  transferSourceType!: TransferSourceType;

  /**
   * S → null
   * T → nx01_warehouse.id（來源倉，必填）
   * G → nx01_partner.id（partner_type='S' 同行，必填）
   * B → null（CO 由 translator 內部建立）
   */
  @IsOptional()
  @IsString()
  @Length(15, 15)
  transferSourceRef?: string | null;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class TranslateSoDto {
  @IsString()
  @Length(15, 15)
  customerId!: string;

  @IsString()
  @Length(15, 15)
  warehouseId!: string; // SO header 預設出貨倉（line item 各自可不同）

  @IsString()
  @IsIn(['D', 'P', 'C'])
  deliveryType!: string;

  @IsOptional()
  @IsString()
  currencyId?: string;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslateLineItemDto)
  lineItems!: TranslateLineItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export interface TranslateSoLineItemResult {
  lineItemId: string;
  partId: string;
  warehouseId: string;
  qty: string; // Decimal string
  transferSourceType: TransferSourceType;
  transferStatus: 'P' | 'I' | 'C';
  fulfillStatus: 'W' | 'PK' | 'PL' | 'D' | 'F';
  relatedItId: string | null;
  relatedTiId: string | null;
  relatedCoId: string | null;
}

export interface TranslateSoResult {
  soId: string;
  soNumber: string;
  status: string; // 'CONFIRMED'
  lineItems: TranslateSoLineItemResult[];
  itIds: string[];
  rfqIds: string[];
  coIds: string[];
}
