// apps/nx-api/src/nx10/mentorship/dto/nx10-mentorship.dto.ts
// NX10 Mentorship DTO

import { IsDateString, IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePairDto {
  @IsString()
  @MaxLength(15)
  mentorId!: string;

  @IsString()
  @MaxLength(15)
  menteeId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardExp?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class PatchEndDto {
  @IsDateString()
  endDate!: string;

  /** 新人試用期 KPI 達成率（%）。 */
  @IsNumberString()
  menteeKpiRate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
