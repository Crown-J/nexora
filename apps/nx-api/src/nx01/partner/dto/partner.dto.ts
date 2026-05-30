import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

// partner 改制六分類（Crown 2026-05-28）：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
// 舊 BOTH/CUST/SUP 已於 migration 20260528100000 backfill 為 C/C/S
const PARTNER_TYPES = ['C', 'O', 'S', 'T', 'V', 'B'] as const;
const PAY_DOM = ['PREPAY', 'NET30', 'NET60', 'NET90'] as const;
const PAY_IMP = ['TT', 'LC', 'DP', 'DA'] as const;
const CREDIT_STAT = ['N', 'W', 'F'] as const;

export class ListPartnerQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType?: string;
}

export class CreatePartnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_DOM)
  paymentTermDomestic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerGradeId?: string;

  /** M2-c：供應商等級 ID（手動指派、partner_type='S' 用為主、API recalc-supplier-grade 端點自動算） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierGradeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @IsIn(CREDIT_STAT)
  creditStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_IMP)
  paymentTermImport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  incoterm?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 可調貨旗標。partner_type='O' 同行 service 層 create 時預設 true；'C' 保養廠可手動開啟。 */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canTransferStock?: boolean;

  // ── v1.2 對齊 階段 E P2：basic 區補欄（schema 既有、DTO 補對齊） ──
  @IsOptional() @IsString() @MaxLength(50) shortName?: string;
  @IsOptional() @IsString() @MaxLength(100) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(30) fax?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(50) serviceLocation?: string;

  // ── v1.2 階段 E P2：sales 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultWarehouseId?: string;
  @IsOptional() @IsString() @MaxLength(15) salesUserId?: string;

  // ── v1.2 階段 E P2：finance 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultCurrencyId?: string;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(PAY_DOM)
  paymentTermDomestic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerGradeId?: string | null;

  /** M2-c：供應商等級 ID（手動指派、partner_type='S' 用為主） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierGradeId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @IsIn(CREDIT_STAT)
  creditStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_IMP)
  paymentTermImport?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  incoterm?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 可調貨旗標。partner_type='O' 同行 service 層 create 時預設 true；'C' 保養廠可手動開啟。 */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canTransferStock?: boolean;

  // ── v1.2 對齊 階段 E P2：basic 區補欄（schema 既有、DTO 補對齊） ──
  @IsOptional() @IsString() @MaxLength(50) shortName?: string | null;
  @IsOptional() @IsString() @MaxLength(100) nameEn?: string | null;
  @IsOptional() @IsString() @MaxLength(30) fax?: string | null;
  @IsOptional() @IsString() @MaxLength(200) website?: string | null;
  @IsOptional() @IsString() @MaxLength(50) serviceLocation?: string | null;

  // ── v1.2 階段 E P2：sales 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultWarehouseId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) salesUserId?: string | null;

  // ── v1.2 階段 E P2：finance 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultCurrencyId?: string | null;
}
