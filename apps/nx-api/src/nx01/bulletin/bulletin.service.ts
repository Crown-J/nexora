// apps/nx-api/src/nx01/bulletin/bulletin.service.ts
// NX01-08 公告系統 v1.0 service（軌 3 commit 3、對齊 spec v1.0）
//
// 範圍：
//   - 公告 CRUD + status 流轉（draft / scheduled / published / withdrawn / expired）
//   - 對象識別 query（接軌 2 Nx01AudienceQueryService）
//   - 附件 CRUD（接軌 1 FileUploadService、storage_key 跨 backend）
//   - 已讀紀錄（mark / stats）

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/file-upload/file-upload.service';
import { Nx01AudienceQueryService } from '../../shared/nx01/audience-query.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  AttachmentInputDto,
  CreateBulletinDto,
  ListBulletinQueryDto,
  MarkReadDto,
  UpdateBulletinDto,
} from './dto/bulletin.dto';

const SEL = {
  id: true,
  tenantId: true,
  title: true,
  content: true,
  type: true,
  categoryId: true,
  importance: true,
  audienceUserIds: true,
  publishAt: true,
  status: true,
  isPinned: true,
  expiredAt: true,
  readCount: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01BulletinGetPayload<{ select: typeof SEL }>;

const ALLOWED_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  draft: new Set(['scheduled', 'published', 'withdrawn']),
  scheduled: new Set(['published', 'withdrawn']),
  published: new Set(['withdrawn', 'expired']),
  withdrawn: new Set([]),
  expired: new Set([]),
};

@Injectable()
export class BulletinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly fileUpload: FileUploadService,
    private readonly audienceQuery: Nx01AudienceQueryService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // List / GetById
  // ─────────────────────────────────────────────────────────────────

  private whereList(
    tenantId: string,
    q: ListBulletinQueryDto,
  ): Prisma.Nx01BulletinWhereInput {
    const where: Prisma.Nx01BulletinWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.status) where.status = q.status;
    if (q.categoryId) where.categoryId = q.categoryId;
    return where;
  }

  async list(user: RequestUser, q: ListBulletinQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Bulletin.count({ where }),
      this.prisma.nx01Bulletin.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Bulletin.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Bulletin not found');
    return row;
  }

  // ─────────────────────────────────────────────────────────────────
  // Create / Update / SoftDelete
  // ─────────────────────────────────────────────────────────────────

  async create(user: RequestUser, dto: CreateBulletinDto) {
    const tenantId = requireTenantId(user);
    if (dto.categoryId) {
      await this.assertCategoryInTenant(tenantId, dto.categoryId);
    }
    const row = await this.prisma.nx01Bulletin.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        content: dto.content ?? null,
        type: dto.type ?? 'C',
        categoryId: dto.categoryId ?? null,
        importance: dto.importance ?? 'normal',
        audienceUserIds: dto.audienceUserIds ?? [],
        publishAt: dto.publishAt ?? new Date(),
        status: dto.status ?? 'draft',
        isPinned: dto.isPinned ?? false,
        expiredAt: dto.expiredAt ?? null,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.writeAudit(tenantId, user.sub, 'CREATE', row.id, row.title, '建立公告', null, row);
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateBulletinDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Bulletin.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Bulletin not found');
    if (dto.status && dto.status !== existing.status) {
      this.assertStatusTransition(existing.status, dto.status);
    }
    if (dto.categoryId) {
      await this.assertCategoryInTenant(tenantId, dto.categoryId);
    }
    const row = await this.prisma.nx01Bulletin.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.importance !== undefined ? { importance: dto.importance } : {}),
        ...(dto.audienceUserIds !== undefined ? { audienceUserIds: dto.audienceUserIds } : {}),
        ...(dto.publishAt !== undefined ? { publishAt: dto.publishAt } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.expiredAt !== undefined ? { expiredAt: dto.expiredAt } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.writeAudit(
      tenantId,
      user.sub,
      'UPDATE',
      id,
      row.title,
      '修改公告',
      existing,
      row,
    );
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Bulletin.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Bulletin not found');
    const row = await this.prisma.nx01Bulletin.update({
      where: { id },
      data: { isActive: false, status: 'withdrawn', updatedBy: user.sub },
      select: SEL,
    });
    await this.writeAudit(
      tenantId,
      user.sub,
      'DELETE',
      id,
      row.title,
      '軟刪除公告',
      existing,
      row,
    );
    return row;
  }

  // ─────────────────────────────────────────────────────────────────
  // Status 流轉（publish / withdraw）
  // ─────────────────────────────────────────────────────────────────

  async publish(user: RequestUser, id: string) {
    return this.update(user, id, { status: 'published' });
  }

  async withdraw(user: RequestUser, id: string) {
    return this.update(user, id, { status: 'withdrawn' });
  }

  // ─────────────────────────────────────────────────────────────────
  // 對象識別（接軌 2 Nx01AudienceQueryService）
  // ─────────────────────────────────────────────────────────────────

  /**
   * 解析公告對象 user.id 清單（依 category.audience_logic + audienceUserIds 補充）。
   * 對應 NX01-08 spec § 3.2。
   */
  async resolveAudienceUserIds(user: RequestUser, bulletinId: string): Promise<string[]> {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Bulletin.findFirst({
      where: { id: bulletinId, tenantId },
      select: {
        audienceUserIds: true,
        category: {
          select: { code: true, audienceLogic: true, teamId: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Bulletin not found');

    const collected = new Set<string>();

    if (row.category) {
      const c = row.category;
      switch (c.audienceLogic) {
        case 'tenant_all':
        case 'system_all': {
          const users = await this.prisma.nx01User.findMany({
            where: { tenantId, isActive: true },
            select: { id: true },
          });
          users.forEach((u) => collected.add(u.id));
          break;
        }
        case 'leaders_all': {
          const ids = await this.audienceQuery.findLeaderUserIds(tenantId);
          ids.forEach((id) => collected.add(id));
          break;
        }
        case 'by_team_id': {
          if (c.teamId) {
            const ids = await this.audienceQuery.findUserIdsByTeam(tenantId, c.teamId);
            ids.forEach((id) => collected.add(id));
          }
          break;
        }
      }
    }

    // 補充指定 user（在 category 對象外加掛）
    for (const uid of row.audienceUserIds ?? []) {
      collected.add(uid);
    }

    return Array.from(collected);
  }

  // ─────────────────────────────────────────────────────────────────
  // 已讀紀錄
  // ─────────────────────────────────────────────────────────────────

  /** user 點「我已閱讀」時呼叫 */
  async markRead(user: RequestUser, bulletinId: string, dto: MarkReadDto) {
    const tenantId = requireTenantId(user);
    const bulletin = await this.prisma.nx01Bulletin.findFirst({
      where: { id: bulletinId, tenantId },
      select: { id: true },
    });
    if (!bulletin) throw new NotFoundException('Bulletin not found');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01BulletinReadLog.findUnique({
        where: { bulletinId_userId: { bulletinId, userId: user.sub } },
        select: { id: true },
      });
      if (existing) {
        return { alreadyRead: true };
      }
      await tx.nx01BulletinReadLog.create({
        data: {
          tenantId,
          bulletinId,
          userId: user.sub,
          readDurationMs: dto.readDurationMs ?? null,
        },
      });
      await tx.nx01Bulletin.update({
        where: { id: bulletinId },
        data: { readCount: { increment: 1 } },
      });
      return { alreadyRead: false };
    });
  }

  /** 已讀統計（OWNER / HR 限定、給 NX01-08 § 2.5 用）*/
  async getReadStats(user: RequestUser, bulletinId: string) {
    const tenantId = requireTenantId(user);
    const bulletin = await this.prisma.nx01Bulletin.findFirst({
      where: { id: bulletinId, tenantId },
      select: { id: true, readCount: true, title: true },
    });
    if (!bulletin) throw new NotFoundException('Bulletin not found');

    const audienceIds = await this.resolveAudienceUserIds(user, bulletinId);
    const readers = await this.prisma.nx01BulletinReadLog.findMany({
      where: { bulletinId, tenantId },
      select: { userId: true, readAt: true, readDurationMs: true },
      orderBy: { readAt: 'asc' },
    });
    const readerIds = new Set(readers.map((r) => r.userId));
    const unreadUserIds = audienceIds.filter((id) => !readerIds.has(id));

    return {
      bulletinId,
      title: bulletin.title,
      readCount: bulletin.readCount,
      totalAudience: audienceIds.length,
      readers,
      unreadUserIds,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 附件 CRUD（接軌 1 FileUploadService）
  // ─────────────────────────────────────────────────────────────────

  async listAttachments(user: RequestUser, bulletinId: string) {
    const tenantId = requireTenantId(user);
    await this.assertBulletinInTenant(tenantId, bulletinId);
    return this.prisma.nx01BulletinAttachment.findMany({
      where: { bulletinId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addAttachment(
    user: RequestUser,
    bulletinId: string,
    dto: AttachmentInputDto,
  ) {
    const tenantId = requireTenantId(user);
    await this.assertBulletinInTenant(tenantId, bulletinId);

    let buffer: Buffer;
    try {
      buffer = Buffer.from(dto.base64Content, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 content');
    }
    if (buffer.length === 0) {
      throw new BadRequestException('Empty attachment');
    }

    const meta = await this.fileUpload.upload({
      tenantId,
      module: 'nx01-bulletin',
      file: {
        buffer,
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        size: buffer.length,
      },
    });

    return this.prisma.nx01BulletinAttachment.create({
      data: {
        tenantId,
        bulletinId,
        storageKey: meta.storageKey,
        mimeType: meta.mimeType,
        fileSize: meta.size,
        origFilename: meta.origFilename,
        uploaderUserId: user.sub,
      },
    });
  }

  async removeAttachment(user: RequestUser, attachmentId: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01BulletinAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });
    if (!row) throw new NotFoundException('Attachment not found');
    await this.fileUpload.remove(tenantId, row.storageKey);
    await this.prisma.nx01BulletinAttachment.delete({
      where: { id: attachmentId },
    });
    return { ok: true };
  }

  async downloadAttachment(user: RequestUser, attachmentId: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01BulletinAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });
    if (!row) throw new NotFoundException('Attachment not found');
    const { buffer } = await this.fileUpload.download(tenantId, row.storageKey);
    return { buffer, mimeType: row.mimeType, origFilename: row.origFilename };
  }

  // ─────────────────────────────────────────────────────────────────
  // 內部 helpers
  // ─────────────────────────────────────────────────────────────────

  private assertStatusTransition(from: string, to: string): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
      throw new BadRequestException(
        `Invalid bulletin status transition: ${from} → ${to}`,
      );
    }
  }

  private async assertCategoryInTenant(tenantId: string, categoryId: string): Promise<void> {
    const cat = await this.prisma.nx01BulletinCategory.findFirst({
      where: { id: categoryId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException(`Category not found or inactive: ${categoryId}`);
    }
  }

  private async assertBulletinInTenant(tenantId: string, bulletinId: string): Promise<void> {
    const b = await this.prisma.nx01Bulletin.findFirst({
      where: { id: bulletinId, tenantId },
      select: { id: true },
    });
    if (!b) throw new NotFoundException('Bulletin not found');
  }

  private async writeAudit(
    tenantId: string,
    actorUserId: string,
    action: string,
    bulletinId: string,
    title: string,
    summary: string,
    beforeData: Row | null,
    afterData: Row,
  ): Promise<void> {
    await this.audit.write({
      tenantId,
      actorUserId,
      moduleCode: 'NX01',
      action,
      entityTable: 'nx01_bulletin',
      entityId: bulletinId,
      entityCode: title.slice(0, 50),
      summary,
      beforeData: beforeData ? (beforeData as object) : undefined,
      afterData: afterData as object,
    });
  }
}
