// apps/nx-api/src/shared/file-upload/constants/file-upload.tokens.ts
// FileUploadModule DI tokens — 給 storage backend 與 config 注入用。
// 階段 1 本地 stub、階段 2 切 R2 時 token 不變、僅換綁定的 provider。

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const FILE_UPLOAD_CONFIG = Symbol('FILE_UPLOAD_CONFIG');
