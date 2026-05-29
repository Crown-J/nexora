// apps/nx-api/src/nx04/partner-grade-history/dto/partner-grade-history.dto.ts
// NX04-M2 §A C5：客戶等級變更核可 DTO
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGradeChangeRequestDto {
  @IsString()
  @MaxLength(15)
  partnerId!: string;

  @IsString()
  @MaxLength(15)
  newGradeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;
}

export class RejectGradeChangeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  rejectReason!: string;
}

export class ListGradeChangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partnerId?: string;

  /// PENDING / APPROVED / REJECTED
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
