// apps/nx-api/src/nx01/discount-code/discount-code.service.ts
// F1-A 銷貨優惠價子系統 2026-06-08：折扣代碼 CRUD service
// schema Nx01DiscountCode 既有、本軌補 controller + service + UI、業務員自助管理

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateDiscountCodeDto,
  ListDiscountCodeQueryDto,
  UpdateDiscountCodeDto,
} from './dto/discount-code.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  discountType: true,
  discountValue: true,
  managedBy: true,
  remark: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01DiscountCodeGetPayload<{ select: typeof SEL }>;

@Injectable()
export class DiscountCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListDiscountCodeQueryDto): Prisma.Nx01DiscountCodeWhereInput {
    const where: Prisma.Nx01DiscountCodeWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListDiscountCodeQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01DiscountCode.count({ where }),
      this.prisma.nx01DiscountCode.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01DiscountCode.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('DiscountCode not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateDiscountCodeDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01DiscountCode.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`折扣代碼 ${code} 已存在`);
    const row = await this.prisma.nx01DiscountCode.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        discountType: dto.discountType,
        discountValue: new PrismaNs.Decimal(dto.discountValue),
        managedBy: dto.managedBy ?? 'P',
        remark: dto.remark?.trim() || null,
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
      entityTable: 'nx01_discount_code',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立折扣代碼',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateDiscountCodeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01DiscountCode.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('DiscountCode not found');
    const row = await this.prisma.nx01DiscountCode.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined ? { discountValue: new PrismaNs.Decimal(dto.discountValue) } : {}),
        ...(dto.managedBy !== undefined ? { managedBy: dto.managedBy } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
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
      entityTable: 'nx01_discount_code',
      entityId: id,
      entityCode: row.code,
      summary: '修改折扣代碼',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01DiscountCode.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('DiscountCode not found');
    const row = await this.prisma.nx01DiscountCode.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_discount_code',
      entityId: id,
      entityCode: row.code,
      summary: '停用折扣代碼',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return {
      ...row,
      discountValue: row.discountValue.toString(),
    };
  }
}
