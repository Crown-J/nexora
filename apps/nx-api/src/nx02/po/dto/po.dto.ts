import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Nx02ListQueryDto } from '../../../shared/nx02/nx02-list-query.dto';

/** 採購類型（D=國內一般 / I=國外進口 / B=掃貨 Bulk）。對齊 schema nx02_po.purchase_type default 'D'、overview §3.2 + Crown Q2。 */
const PURCHASE_TYPES = ['D', 'I', 'B'] as const;

/**
 * PO 列表查詢（含 purchaseType filter、階段 I P4 國外進貨 UI 用）。
 * 預設不帶 = 全部、'I' = 國外進口、'D' = 國內、'B' = 掃貨。
 */
export class PoListQueryDto extends Nx02ListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(PURCHASE_TYPES as unknown as string[])
  purchaseType?: 'D' | 'I' | 'B';
}

export class CreatePoItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  qty!: number;

  @IsNumber()
  /** 採購單價（寫入明細 unit_cost，即單價快照） */
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  rfqItemId?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreatePoDto {
  @IsDateString()
  poDate!: string;

  @IsString()
  @MaxLength(15)
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  rfqId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyId?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** 採購類型（D 國內 / I 國外 / B 掃貨、default 'D'、NX02-IMPL-01 Phase 3 新增 dto 控制）。 */
  @IsOptional()
  @IsString()
  @IsIn(PURCHASE_TYPES as unknown as string[])
  purchaseType?: 'D' | 'I' | 'B';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items!: CreatePoItemDto[];
}

export class UpdatePoDto {
  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @IsDateString()
  expectedDate?: string | null;

  // T1 進貨對齊批次 2026-06-07：採購主管退件原因（status APPROVED → DRAFT 時填）
  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string | null;
}

export class PatchPoItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsDateString()
  expectedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}
