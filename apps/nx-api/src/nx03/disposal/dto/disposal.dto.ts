// apps/nx-api/src/nx03/disposal/dto/disposal.dto.ts
// NX03 Disposal DTO（報廢單、Crown Q-B1=a 不簽核 D→P 一步到位）
// 對齊 overview §3.3 #8 報廢出庫、source=W

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DISPOSAL_REASONS = ['A', 'B', 'C', 'D'] as const;

export class CreateDisposalItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  /** 報廢庫位（schema NOT NULL、業務上必填）。 */
  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  /** A=損壞 / B=過期 / C=瑕疵 / D=其他（reason=D 時 disposalRemark 必填、service 自律）。 */
  @IsString()
  @IsIn(DISPOSAL_REASONS as unknown as string[])
  disposalReason!: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  disposalRemark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateDisposalDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  disposalDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDisposalItemDto)
  @ArrayMinSize(0)
  items?: CreateDisposalItemDto[];
}

export class UpdateDisposalDto {
  @IsOptional()
  @IsDateString()
  disposalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** DRAFT / POSTED / VOIDED、對齊 Nx03Disposal.status VarChar(30)。 */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}

export class PatchDisposalItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

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
  @IsIn(DISPOSAL_REASONS as unknown as string[])
  disposalReason?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  disposalRemark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
