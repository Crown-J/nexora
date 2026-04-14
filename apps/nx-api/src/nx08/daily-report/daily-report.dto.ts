import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDailyReportDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsDateString()
  reportDate!: string;

  @IsOptional()
  @IsString()
  doneItems?: string;

  @IsOptional()
  @IsString()
  kpiProgress?: string;

  @IsOptional()
  @IsString()
  exceptionItems?: string;

  @IsOptional()
  @IsString()
  tomorrowPlan?: string;
}

export class PatchDailyReportDto {
  @IsOptional()
  @IsString()
  doneItems?: string;

  @IsOptional()
  @IsString()
  kpiProgress?: string;

  @IsOptional()
  @IsString()
  exceptionItems?: string;

  @IsOptional()
  @IsString()
  tomorrowPlan?: string;

  @IsOptional()
  @IsString()
  supervisorReply?: string;
}
