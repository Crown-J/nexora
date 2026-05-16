// apps/nx-api/src/nx03/pk/dto/pk.dto.ts
// NX03 Pk DTO（撿貨單、業務本質 = 待辦工作清單、不寫 ledger）
// 對齊 overview §5.2 撿貨單 = 業務動作集中表

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const TRIGGER_SOURCES = ['S', 'T'] as const; // S=銷貨單SO / T=調撥單ST（退貨 Q-MV1=B 不走撿包）
const DELIVERY_TYPES = ['D', 'P', 'C', 'T'] as const; // D=配送 / P=自取 / C=寄貨 / T=調撥
const PK_ITEM_STATUSES = ['P', 'C', 'M'] as const; // P=待撿 / C=已完成 / M=找不到貨

export class CreatePkItemDto {
  /** triggerSource=S 時填入（SoItem id）；triggerSource=T 時必空。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  refSoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  refSoItemId?: string;

  /** triggerSource=T 時填入（St id）；triggerSource=S 時必空。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  refStId?: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;
}

export class CreatePkDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  pkDate!: string;

  /** S=銷貨單 / T=調撥單（Crown Q-MV1=B：退貨不走撿包、本 enum 不含 R）。 */
  @IsString()
  @IsIn(TRIGGER_SOURCES as unknown as string[])
  triggerSource!: 'S' | 'T';

  /** D=配送 / P=自取 / C=寄貨 / T=調撥。 */
  @IsString()
  @IsIn(DELIVERY_TYPES as unknown as string[])
  deliveryType!: 'D' | 'P' | 'C' | 'T';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePkItemDto)
  @ArrayMinSize(0)
  items?: CreatePkItemDto[];
}

export class UpdatePkDto {
  @IsOptional()
  @IsDateString()
  pkDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** P=待撿貨 / C=撿貨中 / F=已完成 / V=作廢、對齊 Nx03Pk.status VarChar(1)。 */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;
}

export class PatchPkItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  /** P=待撿 / C=已完成 / M=找不到貨（M 時 notFoundReason 必填、service 自律）。 */
  @IsOptional()
  @IsString()
  @IsIn(PK_ITEM_STATUSES as unknown as string[])
  status?: 'P' | 'C' | 'M';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notFoundReason?: string;

  /** 貼紙確認是否完成（依 return_policy 確認對應貼紙）。 */
  @IsOptional()
  @IsBoolean()
  labelChecked?: boolean;
}
