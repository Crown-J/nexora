// apps/nx-api/src/shared/file-upload/interfaces/upload-input.interface.ts
// FileUploadService 對外輸入 / 輸出契約。
// 不依賴 Express.Multer.File；caller（軌 3 controller）解出 multer 後 mapping 進來。

/** 上傳單檔輸入（caller 已從 multer / formidable / 任何來源解出 buffer） */
export interface UploadFileInput {
  /** 檔案二進位內容 */
  buffer: Buffer;
  /** 上傳時原始檔名（僅作 metadata、不參與 storage_key 路徑） */
  originalFilename: string;
  /** MIME 類型（如 application/pdf、image/png） */
  mimeType: string;
  /** 檔案大小（bytes、與 buffer.length 應相等） */
  size: number;
}

/** 上傳完成後的儲存 metadata（caller 拿去寫子表如 nx01_bulletin_attachment） */
export interface StoredFileMeta {
  /** 統一 storage key（跨 backend 通用、本地 = 相對路徑、R2 = object key） */
  storageKey: string;
  /** 檔案大小（bytes） */
  size: number;
  /** MIME 類型 */
  mimeType: string;
  /** 上傳時原始檔名 */
  origFilename: string;
}

/** FileUploadService.upload() 輸入 */
export interface UploadRequest {
  /** 多租戶隔離（必填、強制 storage_key prefix） */
  tenantId: string;
  /** 模組識別碼（如 nx01-bulletin、nx02-po、nx05-payment）— 路徑分區 */
  module: string;
  /** 檔案內容 */
  file: UploadFileInput;
}
