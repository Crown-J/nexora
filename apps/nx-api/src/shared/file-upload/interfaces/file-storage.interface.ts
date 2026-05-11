// apps/nx-api/src/shared/file-upload/interfaces/file-storage.interface.ts
// Storage backend 抽象介面 — 階段 1 本地 fs、階段 2 接 Cloudflare R2。
//
// 切換 R2 時：
//   1. 新增 R2FileStorage implements IFileStorage（put/get/delete/exists）
//   2. FileUploadModule.forRoot() 改綁 R2FileStorage、不動 service
//   3. storage_key 範式跨 backend 共用、不需重命名既有檔案
//
// invariant：
//   - storageKey 範式 = `{tenantId}/{module}/{yyyy}/{mm}/{uuid}{ext}`（service 統一產）
//   - storage 不負責驗證 size / mime（service 上層做）
//   - storage 只負責 raw bytes 存取與 path traversal 防護

export interface IFileStorage {
  /**
   * 寫入二進位內容到指定 key。
   * 若同 key 已存在、覆寫（service 層保證 uuid key 不衝突、storage 不做存在檢查）。
   */
  put(storageKey: string, buffer: Buffer, mimeType: string): Promise<void>;

  /**
   * 讀取二進位內容。
   * @throws FileNotFoundError 當 key 不存在
   */
  get(storageKey: string): Promise<Buffer>;

  /**
   * 刪除檔案。
   * 不存在時不報錯（idempotent）。
   */
  delete(storageKey: string): Promise<void>;

  /** 檔案是否存在。 */
  exists(storageKey: string): Promise<boolean>;
}
