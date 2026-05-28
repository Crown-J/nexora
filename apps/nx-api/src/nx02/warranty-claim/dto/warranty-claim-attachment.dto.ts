// apps/nx-api/src/nx02/warranty-claim/dto/warranty-claim-attachment.dto.ts
// LITE 階段 1 M2-d：保固附件 DTO
//
// fileType: LIC=行照 / PHO=問題照片 / VID=影片
// 檔案大小 guard（service 層）：LIC≤5MB / PHO≤10MB / VID≤100MB

import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const FILE_TYPES = ['LIC', 'PHO', 'VID'] as const;

/**
 * M3-redo-3b：base64 範式（對齊 nx01_bulletin_attachment）。
 * caller 從 file input 讀 base64 後 POST、後端解 base64 → FileUploadService.upload → 註冊 metadata。
 */
export class CreateWarrantyClaimAttachmentDto {
  @IsString()
  @IsIn(FILE_TYPES)
  fileType!: string;

  /** 上傳檔案 base64（不含 data URL prefix） */
  @IsString()
  @MinLength(1)
  base64Content!: string;

  /** 原始檔名 */
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  origFilename!: string;

  /** MIME 類型（例 image/png / video/mp4） */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType!: string;
}
