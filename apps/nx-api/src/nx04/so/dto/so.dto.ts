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

export class CreateSoItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  quoteItemId?: string;

  /// 補貨來源類型（S=本倉/T=自倉調撥/G=同行調貨/B=客戶訂單）。
  /// NX04-M2 §A C2：允許業務手動指定、預設由 schema default 'S' 帶入、
  /// 服務層連動寫入 transferStatus（S→C 補貨完成 / T,G,B→P 待補）
  @IsOptional()
  @IsString()
  @MaxLength(1)
  transferSourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  belowMinReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateSoDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  soDate!: string;

  @IsString()
  @MaxLength(15)
  customerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  quoteId?: string;

  @IsString()
  @MaxLength(1)
  deliveryType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currencyId?: string;

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
  @Type(() => CreateSoItemDto)
  @ArrayMinSize(0)
  items?: CreateSoItemDto[];
}

export class UpdateSoDto {
  @IsOptional()
  @IsDateString()
  soDate?: string;

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
  cancelReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  deliveryType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryAddress?: string;
}

export class PatchSoItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

/// NX04-M2 §A C3：從 SO 行群組建 Nx02Ti 同行調貨單草稿
export class CreateTiFromSoDto {
  /// 同行對象（partner_type='O' OR canTransferStock=true）
  @IsString()
  @MaxLength(15)
  partnerId!: string;

  /// SO line item IDs（需 transferSourceType='G' + transferStatus='P'）
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  soItemIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
