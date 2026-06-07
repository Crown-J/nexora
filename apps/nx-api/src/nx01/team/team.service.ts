// apps/nx-api/src/nx01/team/team.service.ts
// 05 批 T2 2026-06-07：組主檔 service（揭露既有 Nx01Team）
//
// schema 上 nx01_team 沒有 @@unique([tenantId, code])、service 層自防同 tenant 內 code 重複。
// 範式對齊 role.service（軟刪除 + audit log + ref join）。
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateTeamDto, ListTeamQueryDto, UpdateTeamDto } from './dto/team.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  departmentId: true,
  parentTeamId: true,
  warehouseId: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  department: { select: { code: true, name: true } },
  parentTeam: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01TeamGetPayload<{ select: typeof SEL }>;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListTeamQueryDto): Prisma.Nx01TeamWhereInput {
    const where: Prisma.Nx01TeamWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.departmentId?.trim()) where.departmentId = q.departmentId.trim();
    if (q.parentTeamId?.trim()) where.parentTeamId = q.parentTeamId.trim();
    return where;
  }

  async list(user: RequestUser, q: ListTeamQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Team.count({ where }),
      this.prisma.nx01Team.findMany({
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
    const row = await this.prisma.nx01Team.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Team not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateTeamDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();

    // schema 沒 unique 限制、service 層自防（含 mode:insensitive、對齊 role 範式）
    const dup = await this.prisma.nx01Team.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('組代碼已存在、請改用其他代碼');

    // 驗 departmentId 存在於同 tenant
    const dept = await this.prisma.nx01Department.findFirst({
      where: { id: dto.departmentId.trim(), tenantId },
      select: { id: true },
    });
    if (!dept) throw new BadRequestException('departmentId invalid');

    // 驗 parentTeamId（若給）存在 + 同 tenant + 同 department（業務語意：子組必屬同部門）
    if (dto.parentTeamId?.trim()) {
      const parent = await this.prisma.nx01Team.findFirst({
        where: { id: dto.parentTeamId.trim(), tenantId },
        select: { departmentId: true },
      });
      if (!parent) throw new BadRequestException('parentTeamId invalid');
      if (parent.departmentId !== dto.departmentId.trim()) {
        throw new BadRequestException('子組必須與上層組同部門');
      }
    }

    const row = await this.prisma.nx01Team.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        departmentId: dto.departmentId.trim(),
        parentTeamId: dto.parentTeamId?.trim() || null,
        warehouseId: dto.warehouseId?.trim() || null,
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
      entityTable: 'nx01_team',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立組',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateTeamDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Team.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Team not found');

    // 切部門時驗存在；切上層組時驗存在 + 同部門 + 不可自己當自己父
    const nextDepartmentId = dto.departmentId?.trim() ?? existing.departmentId;
    if (dto.departmentId !== undefined && dto.departmentId.trim() !== existing.departmentId) {
      const dept = await this.prisma.nx01Department.findFirst({
        where: { id: nextDepartmentId, tenantId },
        select: { id: true },
      });
      if (!dept) throw new BadRequestException('departmentId invalid');
    }
    if (dto.parentTeamId !== undefined && dto.parentTeamId !== null && dto.parentTeamId.trim()) {
      if (dto.parentTeamId.trim() === id) {
        throw new BadRequestException('parentTeamId 不可為自己');
      }
      const parent = await this.prisma.nx01Team.findFirst({
        where: { id: dto.parentTeamId.trim(), tenantId },
        select: { departmentId: true },
      });
      if (!parent) throw new BadRequestException('parentTeamId invalid');
      if (parent.departmentId !== nextDepartmentId) {
        throw new BadRequestException('子組必須與上層組同部門');
      }
    }

    const row = await this.prisma.nx01Team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId.trim() } : {}),
        ...(dto.parentTeamId !== undefined
          ? { parentTeamId: dto.parentTeamId?.trim() || null }
          : {}),
        ...(dto.warehouseId !== undefined
          ? { warehouseId: dto.warehouseId?.trim() || null }
          : {}),
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
      entityTable: 'nx01_team',
      entityId: id,
      entityCode: row.code,
      summary: '修改組',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Team.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Team not found');
    const row = await this.prisma.nx01Team.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_team',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除組',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { department, parentTeam, warehouse, ...rest } = row;
    return {
      ...rest,
      departmentCode: department?.code ?? null,
      departmentName: department?.name ?? null,
      parentTeamCode: parentTeam?.code ?? null,
      parentTeamName: parentTeam?.name ?? null,
      warehouseCode: warehouse?.code ?? null,
      warehouseName: warehouse?.name ?? null,
    };
  }
}
