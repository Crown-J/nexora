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

export class CreateStockTakeDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  stockTakeDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  scopeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTakeItemDto)
  @ArrayMinSize(0)
  items?: CreateStockTakeItemDto[];
}

export class UpdateStockTakeDto {
  @IsOptional()
  @IsDateString()
  stockTakeDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}

export class CreateStockTakeItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  countedQty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchStockTakeItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  countedQty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
