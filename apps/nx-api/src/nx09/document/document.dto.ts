import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { NX09_DOCUMENT_CATEGORIES } from '../../shared/nx09/nx09-categories';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  /** Document 分類（CR 章則彙編 / SP SOP / JD 工作說明書 / FM 表單 / OT 其他）。 */
  @IsString()
  @IsIn(NX09_DOCUMENT_CATEGORIES as unknown as string[])
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
