/**
 * File: apps/nx-api/src/nx01/rfq/dto/create-rfq.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - POST /nx01/rfq 請求體（class-validator + class-transformer）
 */

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRfqItemDto {
  @IsString()
  @IsNotEmpty()
  partId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001, { message: 'qty must be greater than 0' })
  qty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leadTimeDays?: number | null;

  @IsOptional()
  @IsString()
  remark?: string | null;
}

export class CreateRfqDto {
  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsDateString()
  rfqDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @IsOptional()
  @IsString()
  contactName?: string | null;

  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  remark?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRfqItemDto)
  items!: CreateRfqItemDto[];
}
