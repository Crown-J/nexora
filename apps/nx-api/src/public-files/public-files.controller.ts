// apps/nx-api/src/public-files/public-files.controller.ts
// 平台/租戶層分離軌 + LOGO 上傳軌：公開讀檔 endpoint
//
// 用途：
// - 客戶 dashboard 顯示自家 LOGO（無需 auth、純圖檔）
// - 平台後台預覽剛上傳的 LOGO
//
// 安全防護：
// - 限 GET、限 image MIME（依副檔名映射、不存任何任意檔）
// - 路徑用四級明確 path param（tenantPrefix / yyyy / mm / filename）、不接 catchall
// - 每級嚴格 regex 驗證、繞過會 404
// - 重組後的 storage_key 透過 FileUploadService 的 LocalFileStorage 讀
// - LocalFileStorage 已有 path traversal 防護（resolveSafePath）
// - 短期 cache-control 1 hr（避免修改 LOGO 後客戶端看舊版過久）

import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

import { FILE_STORAGE } from '../shared/file-upload/constants/file-upload.tokens';
import type { IFileStorage } from '../shared/file-upload/interfaces/file-storage.interface';

const TENANT_PREFIX_RE = /^[A-Z0-9]{15}$/;
const YYYY_RE = /^\d{4}$/;
const MM_RE = /^\d{2}$/;
const FILENAME_RE = /^[a-f0-9-]+\.(png|jpe?g|gif|webp)$/i;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

@Controller('files/public')
export class PublicFilesController {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorage) {}

  /**
   * GET /files/public/logos/:tenantPrefix/:yyyy/:mm/:filename
   * 對應 storage_key：{tenantPrefix}/onboarding/{yyyy}/{mm}/{filename}
   * 註：onboarding module 寫死、不接受其他 module（防被當成任意檔案 serve）
   */
  @Get('logos/:tenantPrefix/:yyyy/:mm/:filename')
  async serveLogo(
    @Param('tenantPrefix') tenantPrefix: string,
    @Param('yyyy') yyyy: string,
    @Param('mm') mm: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!TENANT_PREFIX_RE.test(tenantPrefix)) throw new NotFoundException();
    if (!YYYY_RE.test(yyyy)) throw new NotFoundException();
    if (!MM_RE.test(mm)) throw new NotFoundException();
    if (!FILENAME_RE.test(filename)) throw new NotFoundException();

    const storageKey = `${tenantPrefix}/onboarding/${yyyy}/${mm}/${filename}`;
    let buffer: Buffer;
    try {
      buffer = await this.storage.get(storageKey);
    } catch {
      throw new NotFoundException();
    }
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
