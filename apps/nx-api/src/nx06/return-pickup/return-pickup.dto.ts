import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { SignatureDto } from '../dto/nx06-signature.dto';

export class CreateReturnPickupDto {
  @IsString()
  @MaxLength(15)
  srId!: string;

  @IsString()
  @MaxLength(15)
  driverUserId!: string;

  @IsOptional()
  @IsDateString()
  dnDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchReturnPickupDto {
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
