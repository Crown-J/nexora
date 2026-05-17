import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { NX09_KM_ARTICLE_CATEGORIES } from '../../shared/nx09/nx09-categories';

export class CreateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  deptId?: string;

  /** Category（既有 6 SO/BP/RG/CX/EM/OT + 本軌新增 3 FQ/AN/TR、Crown overview v1.0 §3.1 4 大分類擴）。 */
  @IsOptional()
  @IsString()
  @IsIn(NX09_KM_ARTICLE_CATEGORIES as unknown as string[])
  @MaxLength(2)
  category?: string;

  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class PatchArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  deptId?: string;

  /** Category（既有 6 + 本軌新增 3、對齊 CreateArticleDto）。 */
  @IsOptional()
  @IsString()
  @IsIn(NX09_KM_ARTICLE_CATEGORIES as unknown as string[])
  @MaxLength(2)
  category?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
