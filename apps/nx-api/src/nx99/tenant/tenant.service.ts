import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateTenantDto, ListTenantsQueryDto, UpdateTenantDto } from './dto/tenant.dto';

const TENANT_SELECT = {
  id: true,
  code: true,
  name: true,
  nameEn: true,
  status: true,
  remark: true,
  sortNo: true,
  isActive: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  timezone: true,
  locale: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function tenantSnapshot(row: Prisma.Nx99TenantGetPayload<{ select: typeof TENANT_SELECT }>) {
  return { ...row };
}

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private tenantWhereForList(_user: RequestUser, query: ListTenantsQueryDto): Prisma.Nx99TenantWhereInput {
    const where: Prisma.Nx99TenantWhereInput = {};
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { nameEn: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    return where;
  }

  async list(user: RequestUser, query: ListTenantsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.tenantWhereForList(user, query);

    const [total, rows] = await Promise.all([
      this.prisma.nx99Tenant.count({ where }),
      this.prisma.nx99Tenant.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: TENANT_SELECT,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => this.mapRow(r)),
    };
  }

  async getById(_user: RequestUser, id: string) {
    const row = await this.prisma.nx99Tenant.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });
    if (!row) throw new NotFoundException('Tenant not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateTenantDto) {
    const code = dto.code.trim();
    const dup = await this.prisma.nx99Tenant.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Tenant code already exists');

    const sortNo = dto.sortNo ?? 0;
    const isActive = dto.isActive ?? true;

    const created = await this.prisma.nx99Tenant.create({
      data: {
        code,
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        status: dto.status,
        remark: dto.remark?.trim() || null,
        sortNo,
        isActive,
        contactName: dto.contactName?.trim() || null,
        contactEmail: dto.contactEmail?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        timezone: dto.timezone?.trim() || 'Asia/Taipei',
        locale: dto.locale?.trim() || 'zh-TW',
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: TENANT_SELECT,
    });

    await this.audit.write({
      tenantId: created.id,
      actorUserId: user.sub,
      moduleCode: 'NX99',
      action: 'CREATE',
      entityTable: 'nx99_tenant',
      entityId: created.id,
      entityCode: created.code,
      summary: '建立租戶',
      afterData: tenantSnapshot(created) as object,
    });

    return this.mapRow(created);
  }

  async update(user: RequestUser, id: string, dto: UpdateTenantDto) {
    const existing = await this.prisma.nx99Tenant.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });
    if (!existing) throw new NotFoundException('Tenant not found');

    const updated = await this.prisma.nx99Tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale.trim() } : {}),
        updatedBy: user.sub,
      },
      select: TENANT_SELECT,
    });

    await this.audit.write({
      tenantId: id,
      actorUserId: user.sub,
      moduleCode: 'NX99',
      action: 'UPDATE',
      entityTable: 'nx99_tenant',
      entityId: id,
      entityCode: updated.code,
      summary: '修改租戶',
      beforeData: tenantSnapshot(existing) as object,
      afterData: tenantSnapshot(updated) as object,
    });

    return this.mapRow(updated);
  }

  async softDelete(user: RequestUser, id: string) {
    const existing = await this.prisma.nx99Tenant.findUnique({
      where: { id },
      select: TENANT_SELECT,
    });
    if (!existing) throw new NotFoundException('Tenant not found');

    const updated = await this.prisma.nx99Tenant.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: TENANT_SELECT,
    });

    await this.audit.write({
      tenantId: id,
      actorUserId: user.sub,
      moduleCode: 'NX99',
      action: 'DELETE',
      entityTable: 'nx99_tenant',
      entityId: id,
      entityCode: updated.code,
      summary: '軟刪除租戶（is_active=false）',
      beforeData: tenantSnapshot(existing) as object,
      afterData: tenantSnapshot(updated) as object,
    });

    return this.mapRow(updated);
  }

  private mapRow(row: Prisma.Nx99TenantGetPayload<{ select: typeof TENANT_SELECT }>) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      name_en: row.nameEn,
      status: row.status,
      remark: row.remark,
      sort_no: row.sortNo,
      is_active: row.isActive,
      contact_name: row.contactName,
      contact_email: row.contactEmail,
      contact_phone: row.contactPhone,
      timezone: row.timezone,
      locale: row.locale,
      created_at: row.createdAt,
      created_by: row.createdBy,
      updated_at: row.updatedAt,
      updated_by: row.updatedBy,
    };
  }
}
