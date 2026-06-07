// apps/nx-api/src/nx01/part-photo/dto/part-photo.dto.ts
// 02 第三批 T4 2026-06-07：零件照片上傳 DTO（base64 範式、同 bulletin / warranty_claim）
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export class UploadPartPhotoDto {
  /** Base64 編碼的圖檔內容（前端 FileReader.readAsDataURL 後去除 data:image/...;base64, prefix） */
  @IsString()
  @MinLength(1)
  base64Content!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  originalFilename!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortNo?: number;
}

export class UpdatePartPhotoDto {
  /** 排序（0 為主圖；交換主圖時把目標 photo 設 0、其他往後讓） */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortNo?: number;
}

export const ALLOWED_PHOTO_MIME_TYPES = IMAGE_MIME_TYPES;
