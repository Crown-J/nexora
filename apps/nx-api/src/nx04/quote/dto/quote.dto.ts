import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Nx04ListQueryDto } from '../../../shared/nx04/nx04-list-query.dto';

/** 報價單列表查詢（彈窗查詢：區間 + 狀態 + 客戶/人員/料號）。區間只填「起」= 該值單一比對 */
export class QuoteListQueryDto extends Nx04ListQueryDto {
  @IsOptional() @IsString() @MaxLength(30) docNoFrom?: string;
  @IsOptional() @IsString() @MaxLength(30) docNoTo?: string;
  @IsOptional() @IsDateString() createdFrom?: string;
  @IsOptional() @IsDateString() createdTo?: string;
  @IsOptional() @IsDateString() quoteFrom?: string;
  @IsOptional() @IsDateString() quoteTo?: string;
  @IsOptional() @IsIn(['valid', 'expired', 'void']) validity?: string;
  @IsOptional() @IsString() @MaxLength(30) customerCode?: string;
  @IsOptional() @IsString() @MaxLength(100) customerName?: string;
  @IsOptional() @IsString() @MaxLength(50) creator?: string;
  @IsOptional() @IsString() @MaxLength(50) partNo?: string;
  @IsOptional() @IsIn(['FORMAL', 'INSTANT']) source?: string;
}

export class CreateQuoteItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /// 低於 minPrice 時必填的理由（NX04-M2 Crown 2026-05-29 §A C1 拍板）
  @IsOptional()
  @IsString()
  @MaxLength(200)
  belowMinReason?: string;
}

export class CreateQuoteDto {
  /** 省略時後端帶使用者隸屬倉（user_warehouse isPrimary）→ 退而求其次租戶主倉 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  /** 來源：FORMAL 正式報價單（預設）/ INSTANT 即時報價；省略=FORMAL */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  source?: string;

  @IsDateString()
  quoteDate!: string;

  @IsString()
  @MaxLength(15)
  customerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerGradeId?: string;

  /// 業務員（FK nx01_user）；省略時後端帶當前使用者
  @IsOptional()
  @IsString()
  @MaxLength(15)
  salesPersonId?: string;

  /// 參考文號（客戶採購單號等，選填）
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerRefNo?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currencyId?: string;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  @ArrayMinSize(0)
  items?: CreateQuoteItemDto[];
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsDateString()
  quoteDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  /// 業務員（FK nx01_user）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  salesPersonId?: string;

  /// 參考文號（客戶採購單號等，選填）
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerRefNo?: string;

  /// 出貨倉庫（FK nx01_warehouse，表頭可改）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;
}

export class PatchQuoteItemDto {
  /// 換料號（編輯項目可從料號改起；後端重抓料號快照）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /// 低於 minPrice 時必填的理由（NX04-M2 Crown 2026-05-29 §A C1 拍板）
  @IsOptional()
  @IsString()
  @MaxLength(200)
  belowMinReason?: string;
}
