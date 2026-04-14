import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { SignatureDto } from '../dto/nx06-signature.dto';

export class CreatePickupItemDto {
  @IsString()
  @MaxLength(2)
  sourceDocType!: string;

  @IsString()
  @MaxLength(15)
  sourceDocId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  sourceItemId?: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(50)
  partNo!: string;

  @IsString()
  @MaxLength(200)
  partName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qty!: number;
}

export class CreatePickupDto {
  @IsDateString()
  dnDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MaxLength(15)
  driverUserId!: string;

  @IsString()
  @MaxLength(15)
  partnerId!: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  targetWarehouseId?: string;

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
  @MaxLength(20)
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePickupItemDto)
  items!: CreatePickupItemDto[];
}

export class PatchPickupDto {
  @IsString()
  @MaxLength(30)
  status!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureDto)
  signature?: SignatureDto;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
