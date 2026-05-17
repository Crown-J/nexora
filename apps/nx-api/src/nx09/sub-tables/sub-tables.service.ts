// apps/nx-api/src/nx09/sub-tables/sub-tables.service.ts
// NX09 子表 service（IMPL-01 3 子表 + IMPL-02 4 子表 = 7 子表 endpoint）
//
// 對齊：
//   - overview v0.2.0 §8 + plan v0.1.0 §2.L2 + Crown Q3=a 全補
//   - IMPL-01 既有：DocumentVersion list / KmTag list+create / KmFeedback create
//   - IMPL-02 新增：ArticleTag CRUD（link 表 attach/detach）+ MeetingAction CRUD + MeetingAttendee CRUD + MeetingMinutes CRUD

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

// ===== DTO interface（service 內 type、controller 用 class-validator） =====

export interface CreateArticleTagInput { articleId: string; tagId: string; }
export interface CreateMeetingActionInput { meetingId: string; minutesId?: string; title: string; assigneeId: string; dueDate: string; remark?: string; }
export interface PatchMeetingActionInput { title?: string; assigneeId?: string; dueDate?: string; status?: string; resultDesc?: string; remark?: string; }
export interface CreateMeetingAttendeeInput { meetingId: string; userId: string; confirmStatus?: string; }
export interface PatchMeetingAttendeeInput { confirmStatus?: string; actualAttended?: boolean; absentReason?: string; }
export interface CreateMeetingMinutesInput { meetingId: string; content?: string; decisions?: string; }
export interface PatchMeetingMinutesInput { content?: string; decisions?: string; }

@Injectable()
export class Nx09SubTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ===== DocumentVersion（IMPL-01 既有）=====

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

  // ===== KmTag（IMPL-01 既有）=====

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

  // ===== KmFeedback（IMPL-01 既有）=====

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

  // ===== IMPL-02 新增 =====

  // ===== KmArticleTag（link 表 attach/detach）=====

  /** 列文章標籤（透過 articleId、join tag 主檔）。 */
  async listArticleTags(user: RequestUser, articleId: string) {
    const tenantId = requireTenantId(user);
    const article = await this.prisma.nx09KmArticle.findFirst({
      where: { id: articleId.trim(), tenantId },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('KmArticle not found');
    const rows = await this.prisma.nx09KmArticleTag.findMany({
      where: { articleId: article.id },
      include: { tag: { select: { id: true, name: true, sortNo: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { ok: true, articleId: article.id, count: rows.length, rows };
  }

  /** 加標籤（attach、duplicate (articleId, tagId) → 409 BadRequest）。 */
  async createArticleTag(user: RequestUser, dto: CreateArticleTagInput) {
    const tenantId = requireTenantId(user);
    const [article, tag] = await Promise.all([
      this.prisma.nx09KmArticle.findFirst({
        where: { id: dto.articleId.trim(), tenantId },
        select: { id: true },
      }),
      this.prisma.nx09KmTag.findFirst({
        where: { id: dto.tagId.trim(), tenantId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!article) throw new NotFoundException('KmArticle not found');
    if (!tag) throw new NotFoundException('KmTag not found or inactive');

    const existing = await this.prisma.nx09KmArticleTag.findFirst({
      where: { articleId: article.id, tagId: tag.id },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Tag already attached');

    const created = await this.prisma.nx09KmArticleTag.create({
      data: { articleId: article.id, tagId: tag.id, createdBy: user.sub },
    });
    return { ok: true, row: created };
  }

  /** 移除標籤（detach）。 */
  async deleteArticleTag(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09KmArticleTag.findFirst({
      where: { id: id.trim(), article: { tenantId } },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('ArticleTag not found');
    await this.prisma.nx09KmArticleTag.delete({ where: { id: row.id } });
    return { ok: true, deletedId: row.id };
  }

  // ===== MeetingAction（5 CRUD）=====

  async listMeetingActions(user: RequestUser, meetingId: string) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    const rows = await this.prisma.nx09MeetingAction.findMany({
      where: { meetingId: meeting.id, tenantId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 200,
    });
    return { ok: true, meetingId: meeting.id, count: rows.length, rows };
  }

  async getMeetingAction(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09MeetingAction.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!row) throw new NotFoundException('MeetingAction not found');
    return { ok: true, row };
  }

  async createMeetingAction(user: RequestUser, dto: CreateMeetingActionInput) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: dto.meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const created = await this.prisma.nx09MeetingAction.create({
      data: {
        tenantId,
        meetingId: meeting.id,
        minutesId: dto.minutesId?.trim() || null,
        title: dto.title.trim(),
        assigneeId: dto.assigneeId.trim(),
        dueDate: new Date(dto.dueDate),
        status: 'O',
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: created };
  }

  async patchMeetingAction(user: RequestUser, id: string, dto: PatchMeetingActionInput) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingAction.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('MeetingAction not found');

    const data: Record<string, unknown> = { updatedBy: user.sub };
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId.trim();
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'C' && !existing.completedAt) data.completedAt = new Date();
    }
    if (dto.resultDesc !== undefined) data.resultDesc = dto.resultDesc?.trim() ?? null;
    if (dto.remark !== undefined) data.remark = dto.remark?.trim() ?? null;

    const updated = await this.prisma.nx09MeetingAction.update({
      where: { id: existing.id },
      data,
    });
    return { ok: true, row: updated };
  }

  async deleteMeetingAction(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingAction.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('MeetingAction not found');
    await this.prisma.nx09MeetingAction.delete({ where: { id: existing.id } });
    return { ok: true, deletedId: existing.id };
  }

  // ===== MeetingAttendee（4 CRUD：list / create / patch / delete）=====

  async listMeetingAttendees(user: RequestUser, meetingId: string) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    const rows = await this.prisma.nx09MeetingAttendee.findMany({
      where: { meetingId: meeting.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return { ok: true, meetingId: meeting.id, count: rows.length, rows };
  }

  async createMeetingAttendee(user: RequestUser, dto: CreateMeetingAttendeeInput) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: dto.meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const created = await this.prisma.nx09MeetingAttendee.create({
      data: {
        meetingId: meeting.id,
        userId: dto.userId.trim(),
        confirmStatus: dto.confirmStatus ?? 'P',
        actualAttended: false,
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: created };
  }

  async patchMeetingAttendee(user: RequestUser, id: string, dto: PatchMeetingAttendeeInput) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingAttendee.findFirst({
      where: { id: id.trim(), meeting: { tenantId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('MeetingAttendee not found');

    const updated = await this.prisma.nx09MeetingAttendee.update({
      where: { id: existing.id },
      data: {
        ...(dto.confirmStatus !== undefined ? { confirmStatus: dto.confirmStatus } : {}),
        ...(dto.actualAttended !== undefined ? { actualAttended: dto.actualAttended } : {}),
        ...(dto.absentReason !== undefined ? { absentReason: dto.absentReason?.trim() ?? null } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async deleteMeetingAttendee(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingAttendee.findFirst({
      where: { id: id.trim(), meeting: { tenantId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('MeetingAttendee not found');
    await this.prisma.nx09MeetingAttendee.delete({ where: { id: existing.id } });
    return { ok: true, deletedId: existing.id };
  }

  // ===== MeetingMinutes（5 CRUD、每會議 unique 一筆）=====

  async listMeetingMinutes(user: RequestUser, meetingId: string) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    const rows = await this.prisma.nx09MeetingMinutes.findMany({
      where: { meetingId: meeting.id },
      orderBy: { createdAt: 'desc' },
    });
    return { ok: true, meetingId: meeting.id, count: rows.length, rows };
  }

  async getMeetingMinutes(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09MeetingMinutes.findFirst({
      where: { id: id.trim(), meeting: { tenantId } },
    });
    if (!row) throw new NotFoundException('MeetingMinutes not found');
    return { ok: true, row };
  }

  async createMeetingMinutes(user: RequestUser, dto: CreateMeetingMinutesInput) {
    const tenantId = requireTenantId(user);
    const meeting = await this.prisma.nx09Meeting.findFirst({
      where: { id: dto.meetingId.trim(), tenantId },
      select: { id: true },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const existing = await this.prisma.nx09MeetingMinutes.findUnique({
      where: { meetingId: meeting.id },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Minutes already exist for this meeting');

    const created = await this.prisma.nx09MeetingMinutes.create({
      data: {
        meetingId: meeting.id,
        content: dto.content?.trim() ?? null,
        decisions: dto.decisions?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: created };
  }

  async patchMeetingMinutes(user: RequestUser, id: string, dto: PatchMeetingMinutesInput) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingMinutes.findFirst({
      where: { id: id.trim(), meeting: { tenantId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('MeetingMinutes not found');

    const updated = await this.prisma.nx09MeetingMinutes.update({
      where: { id: existing.id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content?.trim() ?? null } : {}),
        ...(dto.decisions !== undefined ? { decisions: dto.decisions?.trim() ?? null } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async deleteMeetingMinutes(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09MeetingMinutes.findFirst({
      where: { id: id.trim(), meeting: { tenantId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('MeetingMinutes not found');
    await this.prisma.nx09MeetingMinutes.delete({ where: { id: existing.id } });
    return { ok: true, deletedId: existing.id };
  }
}
