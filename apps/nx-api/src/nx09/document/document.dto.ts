import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2)
  docCategory!: string;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsDateString()
  expiredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  deptId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  viewPermission?: string;

  @IsString()
  @MaxLength(500)
  fileUrl!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSizeKb?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  initialVersionNo?: string;
}

export class PatchDocumentDto {
  @IsString()
  @MaxLength(500)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSizeKb?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  versionNo?: string;
}
