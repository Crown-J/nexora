// apps/nx-api/src/nx03/stocktake/dto/stocktake.dto.ts
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
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStockTakeDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  stockTakeDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  scopeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  // NX03-STOCK-LITE M2：小門檻（NT$、|realDiffQty × unitCost| ≤ 此值倉管自過、超過走負責人簽核）
  @IsOptional()
  @IsNumber()
  @Min(0)
  smallToleranceQty?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTakeItemDto)
  @ArrayMinSize(0)
  items?: CreateStockTakeItemDto[];
}

export class UpdateStockTakeDto {
  @IsOptional()
  @IsDateString()
  stockTakeDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  // NX03-STOCK-LITE M2：允許在 DRAFT/COUNTING/ADJUSTING 階段調整門檻
  @IsOptional()
  @IsNumber()
  @Min(0)
  smallToleranceQty?: number;
}

export class CreateStockTakeItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  countedQty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchStockTakeItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  countedQty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  // NX03-STOCK-LITE M2：差異原因（S=被偷 / M=算錯 / B=破損 / U=不明、realDiffQty≠0 時建議必填）
  @IsOptional()
  @IsIn(['S', 'M', 'B', 'U'])
  varianceReasonCode?: 'S' | 'M' | 'B' | 'U';
}

// NX03-STOCK-LITE M2：負責人核可決定 DTO（approvalStatus=P 階段可呼叫）
export class DecideStockTakeApprovalDto {
  @IsIn(['A', 'R'])
  decision!: 'A' | 'R';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
