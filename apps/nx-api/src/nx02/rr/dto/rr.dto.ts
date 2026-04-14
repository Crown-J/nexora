import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateRrItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  qty!: number;

  @IsNumber()
  /** 單位成本（寫入 unit_cost，即單價快照） */
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsNumber()
  expectedQty?: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateRrDto {
  @IsDateString()
  rrDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MaxLength(15)
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  rfqId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  poId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyId?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRrItemDto)
  items!: CreateRrItemDto[];
}

export class UpdateRrDto {
  @IsOptional()
  @IsDateString()
  rrDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}

export class PatchRrItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsNumber()
  expectedQty?: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}
