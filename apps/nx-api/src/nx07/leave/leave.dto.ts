import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeaveDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsString()
  @MaxLength(15)
  leaveTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  requestType?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}

export class PatchLeaveDto {
  @IsString()
  @MaxLength(30)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string;
}
