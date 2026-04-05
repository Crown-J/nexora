/**
 * File: apps/nx-api/src/nx01/rfq/dto/patch-reply.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - PATCH /nx01/rfq/:id/reply（與前端 snake_case JSON 欄位名一致）
 */

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PatchReplyItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_price?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lead_time_days?: number | null;

  @IsIn(['R', 'C'])
  status!: 'R' | 'C';
}

export class PatchReplyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PatchReplyItemDto)
  items!: PatchReplyItemDto[];
}
