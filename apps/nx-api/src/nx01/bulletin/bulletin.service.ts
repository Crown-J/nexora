import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateBulletinDto, ListBulletinQueryDto, UpdateBulletinDto } from './dto/bulletin.dto';

const SEL = {
  id: true,
  tenantId: true,
  title: true,
  content: true,
  type: true,
  isPinned: true,
  expiredAt: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01BulletinGetPayload<{ select: typeof SEL }>;

@Injectable()
export class BulletinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListBulletinQueryDto): Prisma.Nx01BulletinWhereInput {
    const where: Prisma.Nx01BulletinWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
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
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Bulletin.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Bulletin not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateBulletinDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Bulletin.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        content: dto.content ?? null,
        type: dto.type ?? 'C',
        isPinned: dto.isPinned ?? false,
        expiredAt: dto.expiredAt ?? null,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_bulletin',
      entityId: row.id,
      entityCode: row.title.slice(0, 50),
      summary: '建立公告',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateBulletinDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Bulletin.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Bulletin not found');
    const row = await this.prisma.nx01Bulletin.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.expiredAt !== undefined ? { expiredAt: dto.expiredAt } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_bulletin',
      entityId: id,
      entityCode: row.title.slice(0, 50),
      summary: '修改公告',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Bulletin.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Bulletin not found');
    const row = await this.prisma.nx01Bulletin.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_bulletin',
      entityId: id,
      entityCode: row.title.slice(0, 50),
      summary: '軟刪除公告',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
