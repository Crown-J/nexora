// apps/nx-api/src/nx02/warranty-claim/dto/warranty-claim.dto.ts
// LITE 階段 1 M2-d：保固申請單 DTO
//
// 業務語意（Crown 2026-05-28 拍板）：
//   - 兩型發起：CUST 客訴型連 SO / SELF 自用型不連 SO
//   - status 流轉：D=DRAFT → S=SUBMITTED → R=REVIEWING → C=COMPLETED / V=VOIDED
//   - result 4 種：NEW=換新 / REF=退錢 / RPR=維修後還 / REJ=駁回

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx02ListQueryDto } from '../../../shared/nx02/nx02-list-query.dto';

const CLAIM_TYPES = ['CUST', 'SELF'] as const;
const RESULTS = ['NEW', 'REF', 'RPR', 'REJ'] as const;

export class ListWarrantyClaimQueryDto extends Nx02ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @IsIn(CLAIM_TYPES)
  claimType?: string;
}

export class CreateWarrantyClaimDto {
  @IsString()
  @IsIn(CLAIM_TYPES)
  claimType!: string;

  /** 客訴型必填、自用型不填（service 層 guard） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  sourceSoId?: string;

  /** SO docNo snapshot（顯示用） */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sourceSoNo?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  supplierId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  qty!: number;

  @IsDateString()
  claimDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  issueDescription!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class UpdateWarrantyClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  sourceSoId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  sourceSoNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  qty?: number;

  @IsOptional()
  @IsDateString()
  claimDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  issueDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string | null;
}

/** 送出（DRAFT → SUBMITTED）、無 body */
export class SubmitWarrantyClaimDto {}

/** 進入審核中（SUBMITTED → REVIEWING）、無 body */
export class StartReviewWarrantyClaimDto {}

/** 登記審核結果（REVIEWING → COMPLETED） */
export class RegisterResultDto {
  @IsString()
  @IsIn(RESULTS)
  result!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  resultRemark!: string;
}

export class VoidWarrantyClaimDto {}
