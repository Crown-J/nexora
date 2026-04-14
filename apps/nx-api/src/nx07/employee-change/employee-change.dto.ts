import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmployeeChangeDto {
  @IsString()
  @MaxLength(15)
  targetUserId!: string;

  @IsString()
  @MaxLength(20)
  changeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  newRoleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  newDepartmentId?: string;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchEmployeeChangeDto {
  @IsString()
  @MaxLength(30)
  status!: string;
}
