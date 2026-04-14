import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { SignatureDto } from '../dto/nx06-signature.dto';

export class CreateDeliveryItemDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  partNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  qty!: number;
}

export class CreateDeliveryStopDto {
  @IsOptional()
  @IsString()
  @MaxLength(1)
  taskType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryItemDto)
  items!: CreateDeliveryItemDto[];
}

export class CreateDeliveryDto {
  @IsDateString()
  dnDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MaxLength(15)
  driverUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  sourceSoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryStopDto)
  stops!: CreateDeliveryStopDto[];
}

export class PatchDeliveryDto {
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

export class PatchDnLocationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
