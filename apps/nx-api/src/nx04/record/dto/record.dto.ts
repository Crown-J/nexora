// apps/nx-api/src/nx04/record/dto/record.dto.ts
// 報價紀錄表 / 詢價紀錄表 的查詢 + 建立 DTO（NX04 紀錄表 A2）
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { Nx04ListQueryDto } from '../../../shared/nx04/nx04-list-query.dto';

/** 報價紀錄查詢（區間只填「起」= 該日單一比對）*/
export class QuoteRecordListQueryDto extends Nx04ListQueryDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  /** 精確客戶 ID 過濾（單據內「從報價紀錄拉入」picker 用）*/
  @IsOptional() @IsString() @MaxLength(15) customerId?: string;
  @IsOptional() @IsString() @MaxLength(30) customerCode?: string;
  @IsOptional() @IsString() @MaxLength(100) customerName?: string;
  @IsOptional() @IsString() @MaxLength(50) creator?: string;
  @IsOptional() @IsString() @MaxLength(50) partNo?: string;
  @IsOptional() @IsIn(['INSTANT', 'QUOTE']) source?: string;
}

/** 詢價紀錄查詢 */
export class InquiryRecordListQueryDto extends Nx04ListQueryDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() @MaxLength(30) partnerCode?: string;
  @IsOptional() @IsString() @MaxLength(100) partnerName?: string;
  @IsOptional() @IsString() @MaxLength(50) creator?: string;
  @IsOptional() @IsString() @MaxLength(50) partNo?: string;
}

export class CreateQuoteRecordDto {
  @IsString() @MaxLength(15) customerId!: string;
  @IsString() @MaxLength(15) partId!: string;
  @IsNumber() @Min(0.0001) qty!: number;
  @IsNumber() @Min(0) unitPrice!: number;

  @IsOptional() @IsDateString() recordDate?: string;
  @IsOptional() @IsString() @MaxLength(15) warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(15) customerGradeId?: string;
  @IsOptional() @IsString() @MaxLength(15) currencyId?: string;
  /** 來源：INSTANT 即時報價（預設）/ QUOTE 由報價單行寫入 */
  @IsOptional() @IsIn(['INSTANT', 'QUOTE']) source?: string;
  @IsOptional() @IsString() @MaxLength(15) sourceDocId?: string;
  /** 調貨旗標（F2 報價④選「調貨」；調貨詢價軌 2026-07-12）*/
  @IsOptional() @IsBoolean() isTransfer?: boolean;
  @IsOptional() @IsString() @MaxLength(15) salesPersonId?: string;
  @IsOptional() @IsString() @MaxLength(200) remark?: string;
}

export class CreateInquiryRecordDto {
  @IsString() @MaxLength(15) sourcePartnerId!: string;
  @IsString() @MaxLength(15) partId!: string;
  @IsNumber() @Min(0.0001) qty!: number;
  @IsNumber() @Min(0) unitPrice!: number;

  @IsOptional() @IsDateString() recordDate?: string;
  @IsOptional() @IsString() @MaxLength(15) warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(15) currencyId?: string;
  @IsOptional() @IsString() @MaxLength(15) salesPersonId?: string;
  @IsOptional() @IsString() @MaxLength(200) remark?: string;
}
