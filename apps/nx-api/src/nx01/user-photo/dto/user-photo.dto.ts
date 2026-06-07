// apps/nx-api/src/nx01/user-photo/dto/user-photo.dto.ts
// 02 第四批 軌 1 2026-06-07：使用者大頭貼上傳 DTO（base64 範式、同零件照片但單張）
import { IsString, MaxLength, MinLength } from 'class-validator';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export class UploadUserPhotoDto {
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
}

export const ALLOWED_USER_PHOTO_MIME_TYPES = IMAGE_MIME_TYPES;
