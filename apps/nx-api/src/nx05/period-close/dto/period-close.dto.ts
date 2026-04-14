import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePeriodCloseDto {
  @IsDateString()
  closingDate!: string;

  @IsOptional()
  @IsBoolean()
  isAuto?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchPeriodCloseDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reopenReason?: string;
}
