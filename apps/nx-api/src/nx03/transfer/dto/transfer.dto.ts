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

export class CreateTransferItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  fromLocationId!: string;

  @IsString()
  @MaxLength(15)
  toLocationId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateTransferDto {
  @IsString()
  @MaxLength(15)
  fromWarehouseId!: string;

  @IsString()
  @MaxLength(15)
  toWarehouseId!: string;

  @IsDateString()
  stDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  @ArrayMinSize(0)
  items?: CreateTransferItemDto[];
}

export class UpdateTransferDto {
  @IsOptional()
  @IsDateString()
  stDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}

export class PatchTransferItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  fromLocationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  toLocationId?: string;

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
