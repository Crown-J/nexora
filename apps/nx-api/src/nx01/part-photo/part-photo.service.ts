// apps/nx-api/src/nx01/part-photo/part-photo.service.ts
// 02 第三批 T4 2026-06-07：零件照片 CRUD service
// 範式對齊 bulletin / warranty_claim 附件（base64 + FileUploadService）
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/file-upload/file-upload.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { ALLOWED_PHOTO_MIME_TYPES, type UploadPartPhotoDto, type UpdatePartPhotoDto } from './dto/part-photo.dto';

const MAX_PHOTOS_PER_PART = 5;

const SEL = {
  id: true,
  tenantId: true,
  partId: true,
  storageKey: true,
  mimeType: true,
  fileSize: true,
  origFilename: true,
  sortNo: true,
  uploaderUserId: true,
  createdAt: true,
} as const;

@Injectable()
export class PartPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUpload: FileUploadService,
  ) {}

  async list(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    await this.assertPart(tenantId, partId);
    const rows = await this.prisma.nx01PartPhoto.findMany({
      where: { tenantId, partId },
      orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }],
      select: SEL,
    });
    return { rows };
  }

  async upload(user: RequestUser, partId: string, dto: UploadPartPhotoDto) {
    const tenantId = requireTenantId(user);
    await this.assertPart(tenantId, partId);

    if (!ALLOWED_PHOTO_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(`照片格式不支援：${dto.mimeType}（限 png/jpeg/gif/webp）`);
    }

    const count = await this.prisma.nx01PartPhoto.count({ where: { tenantId, partId } });
    if (count >= MAX_PHOTOS_PER_PART) {
      throw new BadRequestException(`每顆零件最多 ${MAX_PHOTOS_PER_PART} 張照片`);
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
      module: 'part-photo',
      file: {
        buffer,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        size: buffer.length,
      },
    });

    // sortNo 預設取既有最大 +1（新照片排最後）；若 dto 指定 0 = 設主圖（其他往後讓）
    const nextSortNo = dto.sortNo ?? count;
    if (dto.sortNo === 0 && count > 0) {
      await this.prisma.nx01PartPhoto.updateMany({
        where: { tenantId, partId },
        data: { sortNo: { increment: 1 } },
      });
    }

    return this.prisma.nx01PartPhoto.create({
      data: {
        tenantId,
        partId,
        storageKey: meta.storageKey,
        mimeType: meta.mimeType,
        fileSize: meta.size,
        origFilename: meta.origFilename,
        sortNo: nextSortNo,
        uploaderUserId: user.sub,
      },
      select: SEL,
    });
  }

  /** 改 sortNo（設主圖）：把目標設 0、其他重排 */
  async update(user: RequestUser, partId: string, photoId: string, dto: UpdatePartPhotoDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartPhoto.findFirst({
      where: { id: photoId, tenantId, partId },
      select: { id: true, sortNo: true },
    });
    if (!existing) throw new NotFoundException('Photo not found');

    if (dto.sortNo === 0 && existing.sortNo !== 0) {
      // 設為主圖：當前主圖往後讓
      await this.prisma.nx01PartPhoto.updateMany({
        where: { tenantId, partId, sortNo: 0, NOT: { id: photoId } },
        data: { sortNo: existing.sortNo },
      });
    }

    return this.prisma.nx01PartPhoto.update({
      where: { id: photoId },
      data: {
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
      },
      select: SEL,
    });
  }

  async remove(user: RequestUser, partId: string, photoId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartPhoto.findFirst({
      where: { id: photoId, tenantId, partId },
      select: { id: true, storageKey: true, sortNo: true },
    });
    if (!existing) throw new NotFoundException('Photo not found');

    await this.fileUpload.remove(tenantId, existing.storageKey);
    await this.prisma.nx01PartPhoto.delete({ where: { id: photoId } });

    // 若刪除的是主圖（sortNo=0）、把 sortNo 最小的提上來
    if (existing.sortNo === 0) {
      const next = await this.prisma.nx01PartPhoto.findFirst({
        where: { tenantId, partId },
        orderBy: { sortNo: 'asc' },
        select: { id: true },
      });
      if (next) {
        await this.prisma.nx01PartPhoto.update({ where: { id: next.id }, data: { sortNo: 0 } });
      }
    }

    return { ok: true };
  }

  /** 下載照片（authed、回 buffer + mime） */
  async download(user: RequestUser, partId: string, photoId: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartPhoto.findFirst({
      where: { id: photoId, tenantId, partId },
      select: { storageKey: true, mimeType: true, origFilename: true },
    });
    if (!row) throw new NotFoundException('Photo not found');
    const { buffer } = await this.fileUpload.download(tenantId, row.storageKey);
    return { buffer, mimeType: row.mimeType, origFilename: row.origFilename };
  }

  private async assertPart(tenantId: string, partId: string) {
    const p = await this.prisma.nx01Part.findFirst({ where: { id: partId, tenantId }, select: { id: true } });
    if (!p) throw new BadRequestException('Part not found in tenant');
  }
}
