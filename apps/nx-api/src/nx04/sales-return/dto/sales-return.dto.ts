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

export class CreateSalesReturnItemDto {
  @IsString()
  @MaxLength(15)
  soItemId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsString()
  @MaxLength(1)
  returnReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  concessionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateSalesReturnDto {
  @IsString()
  @MaxLength(15)
  soId!: string;

  @IsDateString()
  srDate!: string;

  @IsString()
  @MaxLength(1)
  returnMethod!: string;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  @ArrayMinSize(0)
  items?: CreateSalesReturnItemDto[];
}

export class UpdateSalesReturnDto {
  @IsOptional()
  @IsDateString()
  srDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string;
}

export class PatchSalesReturnItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  concessionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
