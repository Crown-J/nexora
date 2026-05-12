// apps/nx-api/src/nx01/bulletin/dto/bulletin.dto.ts
// NX01-08 公告系統 v1.0 DTO（軌 3 commit 3、對齊 spec § 4.1）

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListBulletinQueryDto extends Nx01ListQueryDto {
  /** 篩選 status (draft / scheduled / published / withdrawn / expired)、可選 */
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'scheduled', 'published', 'withdrawn', 'expired'])
  status?: string;

  /** 篩選 categoryId (FK)、可選 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  categoryId?: string;
}

export class CreateBulletinDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  /** v0 遺留 type（S=SYSTEM / C=COMPANY / R=REMIND）、後續 task 廢棄；建議改用 categoryId */
  @IsOptional()
  @IsString()
  @IsIn(['S', 'C', 'R'])
  type?: string;

  /** 分類 FK（連 nx01_bulletin_category、v1.0 對象範圍邏輯）*/
  @IsOptional()
  @IsString()
  @MaxLength(15)
  categoryId?: string;

  /** 重要等級：normal=一般 / important=重要 / urgent=緊急 */
  @IsOptional()
  @IsString()
  @IsIn(['normal', 'important', 'urgent'])
  importance?: string;

  /** 補充指定 user IDs（在 category 對象外加掛）*/
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  audienceUserIds?: string[];

  /** 發布時間（預設 now、PRO 可排程未來）*/
  @IsOptional()
  @Type(() => Date)
  publishAt?: Date;

  /** 狀態（預設 draft）*/
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'scheduled', 'published', 'withdrawn', 'expired'])
  status?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @Type(() => Date)
  expiredAt?: Date;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBulletinDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['S', 'C', 'R'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['normal', 'important', 'urgent'])
  importance?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  audienceUserIds?: string[];

  @IsOptional()
  @Type(() => Date)
  publishAt?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'scheduled', 'published', 'withdrawn', 'expired'])
  status?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @Type(() => Date)
  expiredAt?: Date | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/** 標記已讀（user 點「我已閱讀」時呼叫）*/
export class MarkReadDto {
  /** modal 開啟 → 點「我已閱讀」毫秒數（可選、給 §2.5 已讀統計用）*/
  @IsOptional()
  @Type(() => Number)
  readDurationMs?: number;
}

/** 附件上傳 metadata（caller 已從 multer 解出 buffer、轉介給 FileUploadService）*/
export class AttachmentInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  originalFilename!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType!: string;

  @IsString()
  base64Content!: string;
}
