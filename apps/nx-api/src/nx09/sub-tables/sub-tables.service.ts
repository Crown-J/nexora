// apps/nx-api/src/nx09/sub-tables/sub-tables.service.ts
// NX09 子表 core service（3 子表 endpoint：DocumentVersion list / KmTag list+create / KmFeedback create）
//
// 對齊：
//   - overview v1.0 §3.1 #5 + plan §2 L4
//   - Hank Q-H3 拍板：core only（避免本軌膨脹、完整 CRUD 留後續軌）
//
// 3 method：
//   - listDocumentVersions（append-only history、不暴露 PATCH）
//   - listKmTags + createKmTag（標籤主檔基本管理）
//   - createKmFeedback（KM「已解決」按鈕、自動 increment article.helpfulCount）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class Nx09SubTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ===== DocumentVersion =====

  /** 列文件版本歷史（append-only、按 versionNo desc）。 */
  async listDocumentVersions(user: RequestUser, documentId: string) {
    const tenantId = requireTenantId(user);
    const doc = await this.prisma.nx09Document.findFirst({
      where: { id: documentId.trim(), tenantId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const rows = await this.prisma.nx09DocumentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { ok: true, documentId: doc.id, count: rows.length, rows };
  }

  // ===== KmTag =====

  async listKmTags(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx09KmTag.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortNo: 'asc' }, { name: 'asc' }],
      take: 200,
    });
    return { ok: true, count: rows.length, rows };
  }

  async createKmTag(user: RequestUser, dto: { name: string; sortNo?: number }) {
    const tenantId = requireTenantId(user);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name required');

    const created = await this.prisma.nx09KmTag.create({
      data: {
        tenantId,
        name,
        sortNo: dto.sortNo ?? 0,
        isSystem: false,
        isActive: true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: created };
  }

  // ===== KmFeedback =====

  /** 給 KM 文章點「已解決」（accumulate helpfulCount）。 */
  async createKmFeedback(
    user: RequestUser,
    articleId: string,
    dto: { isHelpful?: boolean; comment?: string },
  ) {
    const tenantId = requireTenantId(user);
    const article = await this.prisma.nx09KmArticle.findFirst({
      where: { id: articleId.trim(), tenantId },
      select: { id: true, helpfulCount: true, viewCount: true },
    });
    if (!article) throw new NotFoundException('KmArticle not found');

    const isHelpful = dto.isHelpful ?? true;
    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.nx09KmFeedback.create({
        data: {
          tenantId,
          articleId: article.id,
          userId: user.sub,
          isHelpful,
          comment: dto.comment?.trim() ?? null,
        },
      });
      // accumulate helpfulCount（僅 isHelpful=true 時）
      if (isHelpful) {
        await tx.nx09KmArticle.update({
          where: { id: article.id },
          data: { helpfulCount: { increment: 1 } },
        });
      }
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX09',
        action: 'CREATE',
        entityTable: 'nx09_km_feedback',
        entityId: feedback.id,
        summary: `KM 回饋：article=${article.id} isHelpful=${isHelpful}`,
        afterData: feedback as object,
      });
      return { ok: true, feedback };
    });
  }
}
