// apps/nx-api/src/nx02/qt/dto/qt.dto.ts
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateQtDto {
  @IsString()
  @MaxLength(15)
  rfqId!: string;

  @IsString()
  @MaxLength(15)
  inquiryPartnerId!: string;

  @IsNumber()
  @Min(0)
  quotedPrice!: number;

  @IsNumber()
  @Min(0)
  quotedQuantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class RejectQtBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  rejectReason!: string;
}

export class CancelRfqBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  cancelReason!: string;
}

export class ListRfqQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string; // RFQ status (DRAFT/SENT/REPLIED/CLOSED/CANCELLED)

  @IsOptional()
  @IsString()
  @MaxLength(1)
  rfqType?: string; // 'P' 同行調貨；'G' 一般

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeQts?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
