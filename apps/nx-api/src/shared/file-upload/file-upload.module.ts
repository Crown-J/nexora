// apps/nx-api/src/shared/file-upload/file-upload.module.ts
// FileUploadModule — NEXORA 第一個檔案上傳基礎設施。
//
// 提供：
//   - FileUploadService（高階 API、所有業務模組共用）
//   - IFileStorage（透過 FILE_STORAGE token 注入、階段 1 = LocalFileStorage）
//   - FileUploadConfig（透過 FILE_UPLOAD_CONFIG token 注入、env 載入）
//
// 階段 2 接 Cloudflare R2 時：
//   1. 在本檔加 R2FileStorage provider 並用 NEXORA_UPLOAD_BACKEND env 切換
//   2. caller（業務 controller / service）完全不動
//
// 用法：
//   @Module({ imports: [FileUploadModule] })
//   export class Nx01BulletinModule { ... }
//
//   constructor(private readonly fileUpload: FileUploadService) {}

import { Global, Module } from '@nestjs/common';

import {
  FILE_STORAGE,
  FILE_UPLOAD_CONFIG,
} from './constants/file-upload.tokens';
import { loadFileUploadConfigFromEnv } from './config/file-upload.config';
import { LocalFileStorage } from './storage/local-file-storage';
import { FileUploadService } from './file-upload.service';

@Global()
@Module({
  providers: [
    {
      provide: FILE_UPLOAD_CONFIG,
      useFactory: () => loadFileUploadConfigFromEnv(),
    },
    {
      provide: FILE_STORAGE,
      useClass: LocalFileStorage,
    },
    FileUploadService,
  ],
  exports: [FileUploadService, FILE_STORAGE, FILE_UPLOAD_CONFIG],
})
export class FileUploadModule {}
