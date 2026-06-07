// apps/nx-api/src/nx01/user-photo/user-photo.service.ts
// 02 第四批 軌 1 2026-06-07：使用者大頭貼 service（單張、scalar 欄位在 nx01_user）
//
// 範式對齊零件照片（PartPhotoService）的 base64 + FileUploadService 上傳鏈、
// 但使用者大頭貼是單張、4 個 photo_* scalar 欄位直接掛 nx01_user 上、無獨立 satellite table。
// 取代範式：若 user 已有舊大頭貼、上傳新檔前先 fileUpload.remove 舊 storageKey 避免 leak。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/file-upload/file-upload.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { ALLOWED_USER_PHOTO_MIME_TYPES, type UploadUserPhotoDto } from './dto/user-photo.dto';

@Injectable()
export class UserPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUpload: FileUploadService,
  ) {}

  async upload(actor: RequestUser, targetUserId: string, dto: UploadUserPhotoDto) {
    const tenantId = requireTenantId(actor);
    const existing = await this.assertUser(tenantId, targetUserId);

    if (!ALLOWED_USER_PHOTO_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(`大頭貼格式不支援：${dto.mimeType}（限 png/jpeg/gif/webp）`);
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(dto.base64Content, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 content');
    }
    if (buffer.length === 0) throw new BadRequestException('Empty photo');

    const meta = await this.fileUpload.upload({
      tenantId,
      module: 'user-photo',
      file: {
        buffer,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        size: buffer.length,
      },
    });

    // 取代範式：先寫 DB 換指針、後刪舊檔（避免新檔寫失敗、舊檔已不見）
    const oldStorageKey = existing.photoStorageKey;
    await this.prisma.nx01User.update({
      where: { id: targetUserId },
      data: {
        photoStorageKey: meta.storageKey,
        photoMimeType: meta.mimeType,
        photoFileSize: meta.size,
        photoOrigFilename: meta.origFilename,
        updatedBy: actor.sub,
      },
    });
    if (oldStorageKey) {
      try {
        await this.fileUpload.remove(tenantId, oldStorageKey);
      } catch {
        // 刪舊檔失敗不擋流程（DB 已成功換指針、舊檔為 storage leak、可由清理工作後補）
      }
    }
    return { ok: true, hasPhoto: true };
  }

  async remove(actor: RequestUser, targetUserId: string) {
    const tenantId = requireTenantId(actor);
    const existing = await this.assertUser(tenantId, targetUserId);
    if (!existing.photoStorageKey) {
      // idempotent：本來就沒大頭貼、回 ok
      return { ok: true, hasPhoto: false };
    }
    const oldStorageKey = existing.photoStorageKey;
    await this.prisma.nx01User.update({
      where: { id: targetUserId },
      data: {
        photoStorageKey: null,
        photoMimeType: null,
        photoFileSize: null,
        photoOrigFilename: null,
        updatedBy: actor.sub,
      },
    });
    try {
      await this.fileUpload.remove(tenantId, oldStorageKey);
    } catch {
      // 同上、儲存層失敗不擋流程
    }
    return { ok: true, hasPhoto: false };
  }

  async download(actor: RequestUser, targetUserId: string) {
    const tenantId = requireTenantId(actor);
    const row = await this.prisma.nx01User.findFirst({
      where: { id: targetUserId, tenantId },
      select: { photoStorageKey: true, photoMimeType: true, photoOrigFilename: true },
    });
    if (!row || !row.photoStorageKey || !row.photoMimeType) {
      throw new NotFoundException('Photo not found');
    }
    const { buffer } = await this.fileUpload.download(tenantId, row.photoStorageKey);
    return { buffer, mimeType: row.photoMimeType, origFilename: row.photoOrigFilename };
  }

  private async assertUser(tenantId: string, userId: string) {
    const row = await this.prisma.nx01User.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, photoStorageKey: true },
    });
    if (!row) throw new BadRequestException('User not found in tenant');
    return row;
  }
}
