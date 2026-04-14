import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateArticleDto, PatchArticleDto } from './article.dto';
import { Nx09ArticleListQueryDto } from './nx09-article-list-query.dto';

const TAG_SEL = {
  id: true,
  tagId: true,
  tag: { select: { id: true, name: true } },
} as const;

const HEAD = {
  id: true,
  tenantId: true,
  deptId: true,
  category: true,
  question: true,
  answer: true,
  context: true,
  isActive: true,
  expiredAt: true,
  viewCount: true,
  helpfulCount: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class Nx09ArticleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx09ArticleListQueryDto): Prisma.Nx09KmArticleWhereInput {
    const parts: Prisma.Nx09KmArticleWhereInput[] = [{ tenantId }];
    const activeOnly = (q.activeOnly ?? 'Y').trim().toUpperCase() !== 'N';
    if (activeOnly) parts.push({ isActive: true });
    if (q.tagId?.trim()) {
      parts.push({
        rev_Nx09KmArticleTag_articleId: { some: { tagId: q.tagId.trim() } },
      });
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { question: { contains: s, mode: 'insensitive' } },
          { answer: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx09ArticleListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx09KmArticle.count({ where }),
      this.prisma.nx09KmArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          ...HEAD,
          rev_Nx09KmArticleTag_articleId: { select: TAG_SEL },
        },
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09KmArticle.findFirst({
      where: { id, tenantId },
      select: {
        ...HEAD,
        rev_Nx09KmArticleTag_articleId: { select: TAG_SEL },
      },
    });
    if (!row) throw new NotFoundException('Article not found');
    return row;
  }

  private async syncTags(tx: Prisma.TransactionClient, tenantId: string, articleId: string, actorId: string, tagIds: string[]) {
    await tx.nx09KmArticleTag.deleteMany({ where: { articleId } });
    for (const tid of tagIds) {
      const tag = await tx.nx09KmTag.findFirst({ where: { id: tid.trim(), tenantId }, select: { id: true } });
      if (!tag) throw new BadRequestException(`Unknown tag: ${tid}`);
      await tx.nx09KmArticleTag.create({
        data: {
          articleId,
          tagId: tag.id,
          createdBy: actorId,
        },
      });
    }
  }

  async create(user: RequestUser, dto: CreateArticleDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.$transaction(async (tx) => {
      const a = await tx.nx09KmArticle.create({
        data: {
          tenantId,
          deptId: dto.deptId?.trim() || null,
          category: dto.category?.trim()?.slice(0, 2) || 'SO',
          question: dto.question.trim(),
          answer: dto.answer.trim(),
          context: dto.context?.trim() || null,
          expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : null,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: HEAD,
      });
      if (dto.tagIds?.length) {
        await this.syncTags(tx, tenantId, a.id, user.sub, dto.tagIds);
      }
      return tx.nx09KmArticle.findFirstOrThrow({
        where: { id: a.id },
        select: { ...HEAD, rev_Nx09KmArticleTag_articleId: { select: TAG_SEL } },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'CREATE',
      entityTable: 'nx09_km_article',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立知識文章',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchArticleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09KmArticle.findFirst({
      where: { id, tenantId },
      select: { ...HEAD, rev_Nx09KmArticleTag_articleId: { select: TAG_SEL } },
    });
    if (!existing) throw new NotFoundException('Article not found');
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.nx09KmArticle.update({
        where: { id },
        data: {
          ...(dto.deptId !== undefined ? { deptId: dto.deptId?.trim() || null } : {}),
          ...(dto.category !== undefined ? { category: dto.category?.trim()?.slice(0, 2) || 'SO' } : {}),
          ...(dto.question !== undefined ? { question: dto.question.trim() } : {}),
          ...(dto.answer !== undefined ? { answer: dto.answer.trim() } : {}),
          ...(dto.context !== undefined ? { context: dto.context?.trim() || null } : {}),
          ...(dto.expiredAt !== undefined ? { expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.tagIds) {
        await this.syncTags(tx, tenantId, id, user.sub, dto.tagIds);
      }
      return tx.nx09KmArticle.findFirstOrThrow({
        where: { id },
        select: { ...HEAD, rev_Nx09KmArticleTag_articleId: { select: TAG_SEL } },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'UPDATE',
      entityTable: 'nx09_km_article',
      entityId: id,
      entityCode: id,
      summary: '修改知識文章',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09KmArticle.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Article not found');
    const row = await this.prisma.nx09KmArticle.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'DELETE',
      entityTable: 'nx09_km_article',
      entityId: id,
      entityCode: id,
      summary: '軟刪知識文章',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
