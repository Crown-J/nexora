import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class MeetingMinutesInputDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  decisions?: string;
}

export class MeetingAttendeeInputDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  confirmStatus?: string;
}

export class MeetingActionInputDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(15)
  assigneeId!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class CreateMeetingDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2)
  meetingType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  @MaxLength(15)
  organizerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingMinutesInputDto)
  minutes?: MeetingMinutesInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingAttendeeInputDto)
  attendees?: MeetingAttendeeInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingActionInputDto)
  actions?: MeetingActionInputDto[];
}

export class PatchMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  meetingType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingMinutesInputDto)
  minutes?: MeetingMinutesInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingAttendeeInputDto)
  attendees?: MeetingAttendeeInputDto[];
}
