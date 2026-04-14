import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  deptId?: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
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
