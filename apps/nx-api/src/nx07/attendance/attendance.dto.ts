import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class AttendanceCheckDto {
  @IsOptional()
  @IsDateString()
  workDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip?: string;
}

export class CreateAttendanceDto {
  @IsDateString()
  workDate!: string;

  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  scheduleItemId?: string;
}

export class PatchAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  approveRemark?: string;
}
