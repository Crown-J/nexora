import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateDocumentDto, PatchDocumentDto } from './document.dto';
import { Nx09DocumentListQueryDto } from './nx09-document-list-query.dto';

const VER_SEL = {
  id: true,
  documentId: true,
  versionNo: true,
  fileUrl: true,
  fileSizeKb: true,
  changeSummary: true,
  printCount: true,
  lastPrintAt: true,
  lastPrintBy: true,
  createdAt: true,
  createdBy: true,
} as const;

const DOC_HEAD = {
  id: true,
  tenantId: true,
  title: true,
  docCategory: true,
  deptId: true,
  currentVer: true,
  effectiveDate: true,
  expiredDate: true,
  viewPermission: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function bumpVersion(current: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().slice(0, 10);
  const parts = current.split('.');
  if (parts.length >= 2) {
    const major = parseInt(parts[0]!, 10);
    const minor = parseInt(parts[1]!, 10);
    if (!Number.isNaN(major) && !Number.isNaN(minor)) return `${major}.${minor + 1}`;
  }
  return `${current}.1`.slice(0, 10);
}

@Injectable()
export class Nx09DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx09DocumentListQueryDto): Prisma.Nx09DocumentWhereInput {
    const parts: Prisma.Nx09DocumentWhereInput[] = [{ tenantId }];
    const activeOnly = (q.activeOnly ?? 'Y').trim().toUpperCase() !== 'N';
    if (activeOnly) parts.push({ isActive: true });
    if (q.docCategory?.trim()) parts.push({ docCategory: q.docCategory.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx09DocumentListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx09Document.count({ where }),
      this.prisma.nx09Document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: DOC_HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09Document.findFirst({
      where: { id, tenantId },
      select: {
        ...DOC_HEAD,
        rev_Nx09DocumentVersion_documentId: { orderBy: { createdAt: 'desc' }, select: VER_SEL },
      },
    });
    if (!row) throw new NotFoundException('Document not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateDocumentDto) {
    const tenantId = requireTenantId(user);
    const verNo = (dto.initialVersionNo?.trim() || '1.0').slice(0, 10);
    const row = await this.prisma.$transaction(async (tx) => {
      const d = await tx.nx09Document.create({
        data: {
          tenantId,
          title: dto.title.trim(),
          docCategory: dto.docCategory.trim().slice(0, 2),
          deptId: dto.deptId?.trim() || null,
          currentVer: verNo,
          effectiveDate: new Date(dto.effectiveDate),
          expiredDate: dto.expiredDate ? new Date(dto.expiredDate) : null,
          viewPermission: dto.viewPermission?.trim()?.slice(0, 1) || 'A',
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: DOC_HEAD,
      });
      await tx.nx09DocumentVersion.create({
        data: {
          documentId: d.id,
          versionNo: verNo,
          fileUrl: dto.fileUrl.trim(),
          fileSizeKb: dto.fileSizeKb ?? null,
          changeSummary: dto.changeSummary?.trim() || null,
          createdBy: user.sub,
        },
      });
      return tx.nx09Document.findFirstOrThrow({
        where: { id: d.id },
        select: {
          ...DOC_HEAD,
          rev_Nx09DocumentVersion_documentId: { orderBy: { createdAt: 'desc' }, select: VER_SEL },
        },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'CREATE',
      entityTable: 'nx09_document',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立文件（含初版）',
      afterData: row as object,
    });
    return row;
  }

  async patchVersion(user: RequestUser, id: string, dto: PatchDocumentDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09Document.findFirst({ where: { id, tenantId }, select: DOC_HEAD });
    if (!existing) throw new NotFoundException('Document not found');
    const nextVer = bumpVersion(existing.currentVer, dto.versionNo);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.nx09DocumentVersion.create({
        data: {
          documentId: id,
          versionNo: nextVer,
          fileUrl: dto.fileUrl.trim(),
          fileSizeKb: dto.fileSizeKb ?? null,
          changeSummary: dto.changeSummary?.trim() || null,
          createdBy: user.sub,
        },
      });
      return tx.nx09Document.update({
        where: { id },
        data: { currentVer: nextVer, updatedBy: user.sub },
        select: {
          ...DOC_HEAD,
          rev_Nx09DocumentVersion_documentId: { orderBy: { createdAt: 'desc' }, select: VER_SEL },
        },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'UPDATE',
      entityTable: 'nx09_document',
      entityId: id,
      entityCode: id,
      summary: `文件新版本 ${nextVer}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09Document.findFirst({ where: { id, tenantId }, select: DOC_HEAD });
    if (!existing) throw new NotFoundException('Document not found');
    const row = await this.prisma.nx09Document.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: DOC_HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'DELETE',
      entityTable: 'nx09_document',
      entityId: id,
      entityCode: id,
      summary: '軟刪文件',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
