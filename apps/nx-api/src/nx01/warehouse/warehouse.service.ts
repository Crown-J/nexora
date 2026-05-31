import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateWarehouseDto, ListWarehouseQueryDto, UpdateWarehouseDto } from './dto/warehouse.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  remark: true,
  sortNo: true,
  isActive: true,
  warehouseTypeId: true,
  siteId: true,
  // v1.2 階段 E P4：補對齊
  isMain: true,
  managerUserId: true,
  cityId: true,
  districtId: true,
  streetId: true,
  lane: true,
  alley: true,
  buildingNo: true,
  buildingSubNo: true,
  floor: true,
  roomNo: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  managerUser: { select: { userAccount: true, userName: true } },
  site: { select: { code: true, name: true } },
  warehouseType: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01WarehouseGetPayload<{ select: typeof SEL }>;

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListWarehouseQueryDto): Prisma.Nx01WarehouseWhereInput {
    const where: Prisma.Nx01WarehouseWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListWarehouseQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Warehouse.count({ where }),
      this.prisma.nx01Warehouse.findMany({
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
    const row = await this.prisma.nx01Warehouse.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Warehouse not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateWarehouseDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim();
    const dup = await this.prisma.nx01Warehouse.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Warehouse code already exists');
    // siteId NN（收尾補強）：未指定則掛該租戶主據點 / 第一筆據點
    let siteId = dto.siteId?.trim() || '';
    if (!siteId) {
      const s = await this.prisma.nx01Site.findFirst({
        where: { tenantId },
        orderBy: [{ isMain: 'desc' }, { sortNo: 'asc' }, { code: 'asc' }],
        select: { id: true },
      });
      if (!s) throw new BadRequestException('租戶尚無據點，請先建立據點再建倉庫');
      siteId = s.id;
    }
    const row = await this.prisma.nx01Warehouse.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        remark: dto.remark?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        warehouseTypeId: dto.warehouseTypeId?.trim() || null,
        siteId,
        isActive: dto.isActive ?? true,
        // v1.2 階段 E P4：補對齊
        isMain: dto.isMain ?? false,
        managerUserId: dto.managerUserId?.trim() || null,
        cityId: dto.cityId?.trim() || null,
        districtId: dto.districtId?.trim() || null,
        streetId: dto.streetId?.trim() || null,
        lane: dto.lane ?? null,
        alley: dto.alley ?? null,
        buildingNo: dto.buildingNo ?? null,
        buildingSubNo: dto.buildingSubNo ?? null,
        floor: dto.floor?.trim() || null,
        roomNo: dto.roomNo?.trim() || null,
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
      entityTable: 'nx01_warehouse',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立倉庫',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateWarehouseDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Warehouse.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Warehouse not found');
    const row = await this.prisma.nx01Warehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.warehouseTypeId !== undefined ? { warehouseTypeId: dto.warehouseTypeId } : {}),
        ...(dto.siteId ? { siteId: dto.siteId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        // v1.2 階段 E P4：補對齊
        ...(dto.isMain !== undefined ? { isMain: dto.isMain } : {}),
        ...(dto.managerUserId !== undefined
          ? { managerUserId: dto.managerUserId?.trim() || null }
          : {}),
        ...(dto.cityId !== undefined ? { cityId: dto.cityId?.trim() || null } : {}),
        ...(dto.districtId !== undefined
          ? { districtId: dto.districtId?.trim() || null }
          : {}),
        ...(dto.streetId !== undefined ? { streetId: dto.streetId?.trim() || null } : {}),
        ...(dto.lane !== undefined ? { lane: dto.lane } : {}),
        ...(dto.alley !== undefined ? { alley: dto.alley } : {}),
        ...(dto.buildingNo !== undefined ? { buildingNo: dto.buildingNo } : {}),
        ...(dto.buildingSubNo !== undefined ? { buildingSubNo: dto.buildingSubNo } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor?.trim() || null } : {}),
        ...(dto.roomNo !== undefined ? { roomNo: dto.roomNo?.trim() || null } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_warehouse',
      entityId: id,
      entityCode: row.code,
      summary: '修改倉庫',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Warehouse.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Warehouse not found');
    const row = await this.prisma.nx01Warehouse.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_warehouse',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除倉庫',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { managerUser, site, warehouseType, ...scalar } = row;
    return {
      ...scalar,
      // v1.2 階段 E P4：補關聯顯示欄
      managerUserAccount: managerUser?.userAccount ?? null,
      managerUserName: managerUser?.userName ?? null,
      siteCode: site?.code ?? null,
      siteName: site?.name ?? null,
      warehouseTypeCode: warehouseType?.code ?? null,
      warehouseTypeName: warehouseType?.name ?? null,
    };
  }
}
