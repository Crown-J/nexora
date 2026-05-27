// apps/nx-api/src/nx01/site/site.service.ts
/**
 * Site Service —— 據點主檔（公司物理分點、倉庫之上一層；LITE 預設 1 筆「總公司」）。
 * tenant-scoped，對齊 PartGroup 範式（list/getById/create/update/softDelete + audit）。
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateSiteDto, ListSiteQueryDto, UpdateSiteDto } from './dto/site.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  address: true,
  phone: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListSiteQueryDto): Prisma.Nx01SiteWhereInput {
    const where: Prisma.Nx01SiteWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListSiteQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Site.count({ where }),
      this.prisma.nx01Site.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Site.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Site not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateSiteDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Site.findFirst({ where: { tenantId, code }, select: { id: true } });
    if (dup) throw new ConflictException('Site code already exists in this tenant');
    const row = await this.prisma.nx01Site.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
        phone: dto.phone?.trim() || null,
        sortNo: dto.sortNo ?? 0,
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
      entityTable: 'nx01_site',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立據點',
      afterData: row as object,
    });
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateSiteDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Site.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Site not found');
    const row = await this.prisma.nx01Site.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
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
      entityTable: 'nx01_site',
      entityId: id,
      entityCode: row.code,
      summary: '修改據點',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Site.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Site not found');
    const row = await this.prisma.nx01Site.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_site',
      entityId: id,
      entityCode: row.code,
      summary: '停用據點',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
