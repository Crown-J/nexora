// apps/nx-api/src/nx05/paylog/dto/paylog.dto.ts
// v1.2 階段 F P5 B：paylog + 一對多 settlement DTO

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const NOTE_TYPE = ['R', 'P'] as const; // R=收款 / P=付款
const PM = ['CASH', 'TRANSFER', 'CHECK', 'CREDIT'] as const;

// 對應 nx05_paylog.pay_method 既有 2 碼代號
const PM_MAP: Record<(typeof PM)[number], string> = {
  CASH: 'CA',
  TRANSFER: 'TT',
  CHECK: 'CK',
  CREDIT: 'CR',
};

export function payMethodToDbCode(pm: (typeof PM)[number]): string {
  return PM_MAP[pm];
}

export class SettlementInputDto {
  @IsOptional() @IsString() @MaxLength(15) arId?: string;
  @IsOptional() @IsString() @MaxLength(15) apId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  settledAmount!: number;

  @IsOptional() @IsString() @MaxLength(200) remark?: string;
}

export class CreatePaylogWithSettlementsDto {
  @IsString() @IsIn(NOTE_TYPE) noteType!: 'R' | 'P';
  @IsString() @IsIn(PM) paymentMethod!: 'CASH' | 'TRANSFER' | 'CHECK' | 'CREDIT';

  @IsString() @MinLength(1) @MaxLength(15) partnerId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString() noteDate!: string; // YYYY-MM-DD

  @IsOptional() @IsString() @MaxLength(200) remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SettlementInputDto)
  settlements!: SettlementInputDto[];
}
