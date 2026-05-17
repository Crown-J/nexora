// apps/nx-api/src/nx10/sprint/dto/nx10-sprint.dto.ts
// NX10 Sprint DTO

import { IsBoolean, IsDateString, IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

const SPRINT_TYPES = ['WS', 'ME', 'QR'] as const;

export class CreateSprintDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(SPRINT_TYPES as unknown as string[])
  sprintType!: 'WS' | 'ME' | 'QR';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  /** Exp 倍率（Decimal 字串、例 2.00 / 1.50 / 3.00）。 */
  @IsNumberString()
  expMultiplier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetDesc?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchSprintDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  expMultiplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetDesc?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
