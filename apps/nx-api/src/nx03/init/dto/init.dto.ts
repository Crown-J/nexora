// apps/nx-api/src/nx03/init/dto/init.dto.ts
// NX03 Init DTO（開帳單、業務員手動建初始庫存）
// 對齊 overview §3.3 開帳業務 + Crown Q-Phase3-1=a 不簽核（D → P 一步到位）

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInitItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  /** 開帳庫位（業務上必填、service 層校驗）。 */
  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateInitDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  initDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInitItemDto)
  @ArrayMinSize(0)
  items?: CreateInitItemDto[];
}

export class UpdateInitDto {
  @IsOptional()
  @IsDateString()
  initDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** D(DRAFT) / P(POSTED) / V(VOIDED)、對齊 Nx03Init.status VarChar(1)。 */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;
}

export class PatchInitItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
