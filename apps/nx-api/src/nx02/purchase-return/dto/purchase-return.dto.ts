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

/** 退貨類型（F=全部退 / P=部分退 default / A=折讓不退）。對齊 schema nx02_pr.return_mode + overview §3.8 + Crown Q19=d 多種並存。 */
const RETURN_MODES = ['F', 'P', 'A'] as const;

export class CreatePurchaseReturnItemDto {
  @IsString()
  @MaxLength(15)
  rrItemId!: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  qty!: number;

  @IsNumber()
  /** 退貨成本快照 → unit_cost */
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreatePurchaseReturnDto {
  @IsDateString()
  prDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MaxLength(15)
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  rrId?: string;

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

  /** 退貨類型（F=全部退 / P=部分退 default / A=折讓不退、NX02-IMPL-01 Phase 3 新增 dto 控制）。 */
  @IsOptional()
  @IsString()
  @IsIn(RETURN_MODES as unknown as string[])
  returnMode?: 'F' | 'P' | 'A';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnItemDto)
  items!: CreatePurchaseReturnItemDto[];
}

export class UpdatePurchaseReturnDto {
  @IsOptional()
  @IsDateString()
  prDate?: string;

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

  /** 退貨類型可改（DRAFT 階段、影響過帳分流邏輯）。 */
  @IsOptional()
  @IsString()
  @IsIn(RETURN_MODES as unknown as string[])
  returnMode?: 'F' | 'P' | 'A';
}

export class PatchPurchaseReturnItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}
