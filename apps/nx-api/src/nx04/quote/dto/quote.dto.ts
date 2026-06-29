import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

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
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

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
}

export class PatchQuoteItemDto {
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
