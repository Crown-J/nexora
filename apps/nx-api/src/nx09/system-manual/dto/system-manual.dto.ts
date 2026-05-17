// apps/nx-api/src/nx09/system-manual/dto/system-manual.dto.ts
// NX09 SystemManual DTO

import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { NX09_SYSTEM_MANUAL_CATEGORIES } from '../../../shared/nx09/nx09-categories';

/** featureKey 命名規範 regex（模組.功能.動作、小寫 + 數字 + 點）。 */
const FEATURE_KEY_REGEX = /^[a-z0-9]+(\.[a-z0-9]+)+$/;

export class CreateSystemManualDto {
  @IsString()
  @MaxLength(50)
  @Matches(FEATURE_KEY_REGEX, { message: 'featureKey 須符合命名規範：模組.功能.動作（如 nx04.so.create）' })
  featureKey!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  /** 操作步驟 JSON 字串陣列。 */
  @IsOptional()
  @IsString()
  steps?: string;

  /** screenshot URL JSON 字串陣列。 */
  @IsOptional()
  @IsString()
  screenshots?: string;

  @IsOptional()
  @IsString()
  @IsIn(NX09_SYSTEM_MANUAL_CATEGORIES as unknown as string[])
  category?: 'GENERAL' | 'FAQ' | 'TROUBLESHOOT';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class PatchSystemManualDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  steps?: string;

  @IsOptional()
  @IsString()
  screenshots?: string;

  @IsOptional()
  @IsString()
  @IsIn(NX09_SYSTEM_MANUAL_CATEGORIES as unknown as string[])
  category?: 'GENERAL' | 'FAQ' | 'TROUBLESHOOT';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
