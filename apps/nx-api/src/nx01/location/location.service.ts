// apps/nx-api/src/nx01/location/location.service.ts
/**
 * Location Service（補後端軌：仿 warehouse + warehouseId 外鍵 verify）
 *
 * 5 endpoint：list / getById / create / update / softDelete
 * code 倉內唯一（同 warehouseId 下不重複）；停用走軟刪除（isActive=false、不刪資料）。
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateLocationDto, ListLocationQueryDto, UpdateLocationDto } from './dto/location.dto';

const SEL = {
  id: true,
  tenantId: true,
  warehouseId: true,
  code: true,
  name: true,
  zone: true,
  rack: true,
  levelNo: true,
  binNo: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01LocationGetPayload<{ select: typeof SEL }>;

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 確認 warehouseId 屬同租戶（外鍵防呆） */
  private async verifyWarehouse(tenantId: string, warehouseId: string): Promise<void> {
    const w = await this.prisma.nx01Warehouse.findFirst({
      where: { id: warehouseId, tenantId },
      select: { id: true },
    });
    if (!w) throw new BadRequestException('Warehouse not found in tenant');
  }

  private whereList(tenantId: string, q: ListLocationQueryDto): Prisma.Nx01LocationWhereInput {
    const where: Prisma.Nx01LocationWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { zone: { contains: s, mode: 'insensitive' } },
        { rack: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListLocationQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Location.count({ where }),
      this.prisma.nx01Location.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Location.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Location not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateLocationDto) {
    const tenantId = requireTenantId(user);
    await this.verifyWarehouse(tenantId, dto.warehouseId);
    const code = dto.code.trim();
    const dup = await this.prisma.nx01Location.findFirst({
      where: { tenantId, warehouseId: dto.warehouseId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Location code already exists in this warehouse');
    const row = await this.prisma.nx01Location.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        code,
        name: dto.name?.trim() || null,
        zone: dto.zone?.trim() || null,
        rack: dto.rack?.trim() || null,
        levelNo: dto.levelNo ?? null,
        binNo: dto.binNo?.trim() || null,
        remark: dto.remark?.trim() || null,
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
      entityTable: 'nx01_location',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立據點',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateLocationDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Location.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Location not found');
    if (dto.warehouseId !== undefined) await this.verifyWarehouse(tenantId, dto.warehouseId);
    const row = await this.prisma.nx01Location.update({
      where: { id },
      data: {
        ...(dto.warehouseId !== undefined ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone } : {}),
        ...(dto.rack !== undefined ? { rack: dto.rack } : {}),
        ...(dto.levelNo !== undefined ? { levelNo: dto.levelNo } : {}),
        ...(dto.binNo !== undefined ? { binNo: dto.binNo } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
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
      entityTable: 'nx01_location',
      entityId: id,
      entityCode: row.code,
      summary: '修改據點',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Location.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Location not found');
    const row = await this.prisma.nx01Location.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_location',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除據點',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
