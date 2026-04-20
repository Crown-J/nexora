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

const PARTNER_TYPES = ['C', 'S', 'T', 'V', 'B', 'BOTH', 'CUST', 'SUP'] as const;
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
}
