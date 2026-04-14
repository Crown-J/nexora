import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOvertimeDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsDateString()
  workDate!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  otType?: string;
}

export class PatchOvertimeDto {
  @IsString()
  @MaxLength(30)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string;
}
