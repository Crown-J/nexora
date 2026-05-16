// apps/nx-api/src/nx03/conversion/dto/conversion.dto.ts
// NX03 Conversion DTO（重組 / 分解、Crown Q-Phase6-1=c 共用 service、依 conversionType 分派）
// 對齊 overview §3.3 #9 重組 source=M / #10 分解 source=D

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

const CONVERSION_TYPES = ['M', 'D'] as const; // M=merge 重組 / D=disassemble 分解

export class CreateConversionInputDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  /** unitCost 可選：過帳時若 0 走 stock_balance.avgCost（出庫成本標準）。 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateConversionOutputDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  /**
   * 分解 D 時可選 costRatio 人工指定（0~1.0、∑outputs.costRatio 應 = 1.0）
   * - null：service auto 按 part.priceA 比例分攤（Q-B2=priceA）
   * - 非 null：人工指定
   * - 重組 M 時：必空（output 唯一、unitCost = Σ inputs 加權自動算）
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  costRatio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateConversionDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  conversionDate!: string;

  /** M=merge 重組（N inputs → 1 output）/ D=disassemble 分解（1 input → N outputs）。 */
  @IsString()
  @IsIn(CONVERSION_TYPES as unknown as string[])
  conversionType!: 'M' | 'D';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** 輸入明細（M: N rows、D: 1 row）。 */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConversionInputDto)
  @ArrayMinSize(1)
  inputs!: CreateConversionInputDto[];

  /** 輸出明細（M: 1 row、D: N rows）。 */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConversionOutputDto)
  @ArrayMinSize(1)
  outputs!: CreateConversionOutputDto[];
}

export class UpdateConversionDto {
  @IsOptional()
  @IsDateString()
  conversionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** DRAFT / POSTED / VOIDED、對齊 Nx03Conversion.status VarChar(30)。 */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
