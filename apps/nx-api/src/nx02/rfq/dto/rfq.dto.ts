import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRfqItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  qty!: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateRfqDto {
  @IsDateString()
  rfqDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  rfqType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rfqReason?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  demandId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRfqItemDto)
  items!: CreateRfqItemDto[];
}

export class UpdateRfqDto {
  @IsOptional()
  @IsDateString()
  rfqDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;
}

export class PatchRfqItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leadTimeDays?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}
