// apps/nx-api/src/nx10/promotion/dto/nx10-promotion.dto.ts
// NX10 Promotion 轉職機制 DTO（3 階審核 ⭐⭐⭐ 業界改革）

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const REVIEW_STATUSES = ['A', 'R', 'X'] as const;

export class CreateCriteriaDto {
  @IsString()
  @MaxLength(15)
  fromRoleId!: string;

  @IsString()
  @MaxLength(15)
  toRoleId!: string;

  @IsString()
  @MaxLength(15)
  minMedalLevelId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minTenureMonths?: number;

  @IsOptional()
  @IsNumberString()
  minKpiRate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minMentorshipCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  noPenaltyDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class ApplyRequestDto {
  @IsString()
  @MaxLength(15)
  criteriaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class PatchSupervisorRecommendDto {
  @IsString()
  supervisorRecommend!: string;
}

export class ReviewRequestDto {
  /** A=核准 / R=退件 / X=取消 */
  @IsString()
  @IsIn(REVIEW_STATUSES as unknown as string[])
  status!: 'A' | 'R' | 'X';

  /** status=R 時必填。 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}
