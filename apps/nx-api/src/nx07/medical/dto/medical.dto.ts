// apps/nx-api/src/nx07/medical/dto/medical.dto.ts
// NX07 醫療管理 DTO（MedicalRecord + Injury）

import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const RECORD_TYPES = ['ANNUAL', 'SPECIAL', 'FOLLOWUP'] as const;
const INJURY_TYPES = ['LIFT', 'CUT', 'CHEM', 'MACHINE', 'ERGO', 'OTHER'] as const;
const INJURY_STATUSES = ['REPORTED', 'TREATING', 'RECOVERED', 'DISABLED', 'FATAL'] as const;

export class CreateMedicalRecordDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsDateString()
  recordDate!: string;

  @IsOptional()
  @IsString()
  @IsIn(RECORD_TYPES as unknown as string[])
  recordType?: 'ANNUAL' | 'SPECIAL' | 'FOLLOWUP';

  /** 體檢項目 + 結果（JSON 字串、後續軌升結構化）。 */
  @IsOptional()
  @IsString()
  examItems?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  conclusion?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hospitalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchMedicalRecordDto {
  @IsOptional()
  @IsString()
  @IsIn(RECORD_TYPES as unknown as string[])
  recordType?: 'ANNUAL' | 'SPECIAL' | 'FOLLOWUP';

  @IsOptional()
  @IsString()
  examItems?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  conclusion?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hospitalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateInjuryDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsDateString()
  injuryDate!: string;

  @IsOptional()
  @IsString()
  @IsIn(INJURY_TYPES as unknown as string[])
  injuryType?: 'LIFT' | 'CUT' | 'CHEM' | 'MACHINE' | 'ERGO' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  injuryLocation?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchInjuryStatusDto {
  @IsString()
  @IsIn(INJURY_STATUSES as unknown as string[])
  status!: 'REPORTED' | 'TREATING' | 'RECOVERED' | 'DISABLED' | 'FATAL';

  /** insuranceClaim Decimal 字串（≥ 0）。 */
  @IsOptional()
  @IsNumberString()
  insuranceClaim?: string;

  @IsOptional()
  @IsDateString()
  recoveryAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
