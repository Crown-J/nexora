// apps/nx-api/src/nx02/warranty-claim/dto/warranty-claim-attachment.dto.ts
// LITE 階段 1 M2-d：保固附件 DTO
//
// fileType: LIC=行照 / PHO=問題照片 / VID=影片
// 檔案大小 guard（service 層）：LIC≤5MB / PHO≤10MB / VID≤100MB

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const FILE_TYPES = ['LIC', 'PHO', 'VID'] as const;

export class CreateWarrantyClaimAttachmentDto {
  @IsString()
  @IsIn(FILE_TYPES)
  fileType!: string;

  /** storageKey 由 caller（FileUploadService）傳入、後端只註冊 metadata */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSize!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  origFilename!: string;
}
