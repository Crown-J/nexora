// apps/nx-api/src/nx09/vin-lookup/dto/vin-lookup.dto.ts
// NX09 VinLookup DTOs（VIN 17 碼 + NHTSA decode + 手動建檔）

import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const VIN_REGEX_DESC = 'VIN 17 碼（ISO 3779 / SAE J853、I/O/Q 不允許）';

export class DecodeVinDto {
  /** VIN 17 碼（自動 toUpperCase + trim）。 */
  @IsString()
  @Length(17, 17)
  vin!: string;

  /** 業務員備註（NHTSA decode 失敗時可後補）。 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateVinLookupManualDto {
  /** VIN 17 碼。 */
  @IsString()
  @Length(17, 17)
  vin!: string;

  /** 車型品牌 ID（可空）。 */
  @IsOptional()
  @IsString()
  carBrandId?: string;

  /** 車型 ID（可空、業務員手動關料件鏈基底）。 */
  @IsOptional()
  @IsString()
  modelId?: string;

  /** 業務員備註。 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class PatchVinLookupDto {
  /** 補綁定 carBrandId（NHTSA 查不到時業務員後補）。 */
  @IsOptional()
  @IsString()
  carBrandId?: string;

  /** 補綁定 modelId。 */
  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['API', 'MANUAL'])
  source?: string;
}
