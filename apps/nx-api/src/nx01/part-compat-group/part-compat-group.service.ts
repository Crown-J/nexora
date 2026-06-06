// apps/nx-api/src/nx01/part-compat-group/part-compat-group.service.ts
// 02 對齊第二批 C 軌 CP2-c 2026-06-06：通用件群組 + member CRUD
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateGroupMemberDto,
  CreatePartCompatGroupDto,
  ListPartCompatGroupQueryDto,
  UpdateGroupMemberDto,
  UpdatePartCompatGroupDto,
} from './dto/part-compat-group.dto';

const GROUP_SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const MEMBER_SEL = {
  id: true,
  tenantId: true,
  groupId: true,
  partId: true,
  role: true,
  customPrice: true,
  isBidirectional: true,
  sortNo: true,
  remark: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  part: { select: { code: true, name: true } },
} as const;

@Injectable()
export class PartCompatGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ───── group CRUD ─────
  async list(user: RequestUser, q: ListPartCompatGroupQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01PartCompatGroupWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartCompatGroup.count({ where }),
      this.prisma.nx01PartCompatGroup.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: GROUP_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { id, tenantId },
      select: GROUP_SEL,
    });
    if (!row) throw new NotFoundException('Part compat group not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePartCompatGroupDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('群組代碼已存在、請改用其他代碼');
    const row = await this.prisma.nx01PartCompatGroup.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        remark: dto.remark?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: GROUP_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_part_compat_group',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立通用件群組',
      afterData: row as object,
    });
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdatePartCompatGroupDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { id, tenantId },
      select: GROUP_SEL,
    });
    if (!existing) throw new NotFoundException('Part compat group not found');
    const row = await this.prisma.nx01PartCompatGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: GROUP_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part_compat_group',
      entityId: id,
      entityCode: row.code,
      summary: '修改通用件群組',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { id, tenantId },
      select: GROUP_SEL,
    });
    if (!existing) throw new NotFoundException('Part compat group not found');
    const row = await this.prisma.nx01PartCompatGroup.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: GROUP_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_compat_group',
      entityId: id,
      entityCode: row.code,
      summary: '停用通用件群組',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  // ───── member CRUD（衛星表） ─────
  async listMembers(user: RequestUser, groupId: string) {
    const tenantId = requireTenantId(user);
    const group = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { id: groupId, tenantId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Part compat group not found');
    const rows = await this.prisma.nx01PartCompatGroupMember.findMany({
      where: { tenantId, groupId },
      orderBy: [{ role: 'asc' }, { sortNo: 'asc' }, { createdAt: 'asc' }],
      select: MEMBER_SEL,
    });
    return { rows };
  }

  async addMember(user: RequestUser, groupId: string, dto: CreateGroupMemberDto) {
    const tenantId = requireTenantId(user);
    const group = await this.prisma.nx01PartCompatGroup.findFirst({
      where: { id: groupId, tenantId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Part compat group not found');
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: dto.partId.trim(), tenantId },
      select: { id: true },
    });
    if (!part) throw new BadRequestException('partId 找不到');
    const dup = await this.prisma.nx01PartCompatGroupMember.findFirst({
      where: { tenantId, groupId, partId: dto.partId.trim() },
      select: { id: true },
    });
    if (dup) throw new ConflictException('該 part 已在群組內');
    const row = await this.prisma.nx01PartCompatGroupMember.create({
      data: {
        tenantId,
        groupId,
        partId: dto.partId.trim(),
        role: dto.role ?? 2,
        customPrice: dto.customPrice ?? null,
        isBidirectional: dto.isBidirectional ?? true,
        sortNo: dto.sortNo ?? 0,
        remark: dto.remark?.trim() || null,
        isActive: true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: MEMBER_SEL,
    });
    return row;
  }

  async updateMember(user: RequestUser, groupId: string, memberId: string, dto: UpdateGroupMemberDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartCompatGroupMember.findFirst({
      where: { id: memberId, tenantId, groupId },
      select: MEMBER_SEL,
    });
    if (!existing) throw new NotFoundException('Member not found');
    const row = await this.prisma.nx01PartCompatGroupMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.customPrice !== undefined ? { customPrice: dto.customPrice } : {}),
        ...(dto.isBidirectional !== undefined ? { isBidirectional: dto.isBidirectional } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: MEMBER_SEL,
    });
    return row;
  }

  async removeMember(user: RequestUser, groupId: string, memberId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartCompatGroupMember.findFirst({
      where: { id: memberId, tenantId, groupId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Member not found');
    await this.prisma.nx01PartCompatGroupMember.delete({ where: { id: memberId } });
    return { ok: true };
  }
}
