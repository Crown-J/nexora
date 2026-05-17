// apps/nx-api/src/nx02/partner-part/dto/partner-part.dto.ts
// NX02 PartnerPart DTO（partner ↔ part 中間表、partnerId + partId 級）
// 對齊 Crown Q-PP-1=C 混合範式 + Q-PP-2=a 不細分 partnerType=S + Q-PP-3=b 廠商料號選填
// 對齊 Q-S3=A unique [tenantId, partnerId, partId, validFrom] 支援歷史版本

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SOURCES = ['S', 'M'] as const; // S=system 自動同步 / M=manual 手動維護

export class PartnerPartListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreatePartnerPartDto {
  @IsString()
  @MaxLength(15)
  partnerId!: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** 廠商料號（Q-PP-3=b 選填、業界 muscle memory 雙料號對應）。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierPartNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultUnitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultLeadDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moq?: number;

  /** S=system 自動同步 / M=manual 手動維護（預設 M、手動建單）。 */
  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  /** 生效起期（ISO 8601 date、可空、null=即時生效）。 */
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  /** 生效迄期（可空、現役留空、若填必 validFrom < validTo）。 */
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class UpdatePartnerPartDto {
  /** 不允許改 partnerId / partId / validFrom（要改重建）。 */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierPartNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultUnitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultLeadDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moq?: number;

  @IsOptional()
  @IsString()
  @IsIn(SOURCES as unknown as string[])
  source?: 'S' | 'M';

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
