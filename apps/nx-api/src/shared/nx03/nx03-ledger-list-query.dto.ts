import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class Nx03LedgerListQueryDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sourceModule?: string;

  /// 來源單據類型：對齊 overview §3.2 10 種 source（P/S/R/T/I/X/G/W/M/D）
  @IsOptional()
  @IsString()
  @MaxLength(1)
  sourceDocType?: string;

  /// 異動類型篩選（I=入庫、O=出庫、A=盤點調整、對齊 AUDIT-03 業務語意）
  @IsOptional()
  @IsString()
  @IsIn(['I', 'O', 'A'])
  movementType?: 'I' | 'O' | 'A';

  /// 起始異動時間（ISO 8601、含當天 00:00:00）
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  /// 結束異動時間（ISO 8601、含當天 23:59:59.999、application 層轉換 end-of-day）
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
