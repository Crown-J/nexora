// apps/nx-api/src/nx02/warranty-claim/warranty-claim-attachment.service.ts
// LITE 階段 1 M2-d / M3-redo-3b：保固附件 service。
//
// 業務語意：
//   - 3 種 fileType：LIC=行照 / PHO=問題照片 / VID=影片
//   - 檔案大小 guard：LIC≤5MB / PHO≤10MB / VID≤100MB
//   - M3-redo-3b：改 base64 範式（對齊 nx01_bulletin_attachment）、後端 FileUploadService.upload 拿 storageKey
//   - 附件刪除：硬刪、warranty_claim CASCADE 自動處理整批

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/file-upload/file-upload.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateWarrantyClaimAttachmentDto } from './dto/warranty-claim-attachment.dto';

const ATT_SEL = {
  id: true,
  tenantId: true,
  claimId: true,
  fileType: true,
  storageKey: true,
  mimeType: true,
  fileSize: true,
  origFilename: true,
  uploaderUserId: true,
  createdAt: true,
} as const;

const FILE_SIZE_LIMITS: Record<string, number> = {
  LIC: 5 * 1024 * 1024, // 5 MB
  PHO: 10 * 1024 * 1024, // 10 MB
  VID: 100 * 1024 * 1024, // 100 MB
};

@Injectable()
export class WarrantyClaimAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUpload: FileUploadService,
  ) {}

  async list(user: RequestUser, claimId: string) {
    const tenantId = requireTenantId(user);
    // 確認 claim 屬於 tenant
    const claim = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { id: true },
    });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    const rows = await this.prisma.nx02WarrantyClaimAttachment.findMany({
      where: { tenantId, claimId },
      orderBy: { createdAt: 'asc' },
      select: ATT_SEL,
    });
    return { rows };
  }

  async create(
    user: RequestUser,
    claimId: string,
    dto: CreateWarrantyClaimAttachmentDto,
  ) {
    const tenantId = requireTenantId(user);
    const claim = await this.prisma.nx02WarrantyClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { id: true, voidedAt: true, status: true },
    });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    if (claim.voidedAt) throw new BadRequestException('Cannot add attachment to voided claim');

    // base64 → buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(dto.base64Content, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 content');
    }
    if (buffer.length === 0) {
      throw new BadRequestException('Empty attachment');
    }

    // 檔案大小 guard（base64 解碼後實際大小）
    const limit = FILE_SIZE_LIMITS[dto.fileType];
    if (limit && buffer.length > limit) {
      throw new BadRequestException(
        `fileType=${dto.fileType} 檔案大小超過上限 ${(limit / 1024 / 1024).toFixed(0)}MB（got ${(buffer.length / 1024 / 1024).toFixed(1)}MB）`,
      );
    }

    // FileUploadService.upload 拿 storageKey（接 LocalFileStorage、階段 2 改 R2）
    const meta = await this.fileUpload.upload({
      tenantId,
      module: 'nx02-warranty',
      file: {
        buffer,
        originalFilename: dto.origFilename,
        mimeType: dto.mimeType,
        size: buffer.length,
      },
    });

    const row = await this.prisma.nx02WarrantyClaimAttachment.create({
      data: {
        tenantId,
        claimId,
        fileType: dto.fileType,
        storageKey: meta.storageKey,
        mimeType: meta.mimeType,
        fileSize: meta.size,
        origFilename: meta.origFilename,
        uploaderUserId: user.sub,
      },
      select: ATT_SEL,
    });
    return row;
  }

  async remove(user: RequestUser, claimId: string, attachmentId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02WarrantyClaimAttachment.findFirst({
      where: { id: attachmentId, claimId, tenantId },
      select: ATT_SEL,
    });
    if (!existing) throw new NotFoundException('Attachment not found');
    await this.prisma.nx02WarrantyClaimAttachment.delete({ where: { id: attachmentId } });
    return { ok: true };
  }
}
