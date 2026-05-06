// apps/nx-api/src/shared/file-upload/config/file-upload.config.ts
// FileUploadModule 設定 — 階段 1 本地檔案系統參數 + 共用驗證規則。
//
// 環境變數（apps/nx-api/.env）：
//   NEXORA_UPLOAD_LOCAL_ROOT  本地存放根目錄（絕對路徑、預設 <cwd>/.uploads）
//   NEXORA_UPLOAD_MAX_BYTES   單檔最大 bytes（預設 10 MiB）
//
// 階段 2 接 R2 時、新增 NEXORA_UPLOAD_R2_* 系列變數、共用 maxBytes / allowedMimeTypes。

import * as path from 'node:path';

/** 預設單檔大小上限：10 MiB */
export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/** 預設允許的 MIME 類型（公告附件 + 一般文件 / 圖片 / 試算表 / 壓縮檔） */
export const DEFAULT_ALLOWED_MIME_TYPES: readonly string[] = [
  // 文件
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // 試算表
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // 圖片
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  // 純文字
  'text/plain',
  // 壓縮檔
  'application/zip',
];

export interface FileUploadConfig {
  /** 階段 1：本地檔案系統根目錄（絕對路徑） */
  readonly localRoot: string;
  /** 單檔最大 byte */
  readonly maxBytes: number;
  /** 允許的 MIME type allow-list */
  readonly allowedMimeTypes: readonly string[];
}

/**
 * 從環境變數載入設定。
 * 缺值用預設、不報錯（階段 1 dev 友善）。
 */
export function loadFileUploadConfigFromEnv(): FileUploadConfig {
  const localRoot = process.env.NEXORA_UPLOAD_LOCAL_ROOT
    ? path.resolve(process.env.NEXORA_UPLOAD_LOCAL_ROOT)
    : path.resolve(process.cwd(), '.uploads');

  const maxBytesRaw = process.env.NEXORA_UPLOAD_MAX_BYTES;
  const maxBytes =
    maxBytesRaw && /^\d+$/.test(maxBytesRaw)
      ? Number(maxBytesRaw)
      : DEFAULT_MAX_BYTES;

  return {
    localRoot,
    maxBytes,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  };
}
