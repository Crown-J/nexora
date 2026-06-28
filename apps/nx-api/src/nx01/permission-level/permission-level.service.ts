// apps/nx-api/src/nx01/permission-level/permission-level.service.ts
// 職務↔權限拆分軌 Step3：權限等級 service（CRUD + 等級權限設定）
// 內建 S（isSystem）鎖定不可改/刪/改權限。

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreatePermissionLevelDto,
  ListPermissionLevelQueryDto,
  UpdatePermissionLevelDto,
} from './dto/permission-level.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  isActive: true,
  sortNo: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const PERM_SEL = {
  id: true,
  code: true,
  moduleCode: true,
  category: true,
  action: true,
  name: true,
  description: true,
  sortNo: true,
  isActive: true,
} as const;

@Injectable()
export class PermissionLevelService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, q: ListPermissionLevelQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01PermissionLevelWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    const [total, rows] = await Promise.all([
      this.prisma.nx01PermissionLevel.count({ where }),
      this.prisma.nx01PermissionLevel.findMany({
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
    const row = await this.prisma.nx01PermissionLevel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('權限等級不存在');
    return row;
  }

  async create(user: RequestUser, dto: CreatePermissionLevelDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01PermissionLevel.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('權限等級代碼已存在');
    return this.prisma.nx01PermissionLevel.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        isSystem: false,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePermissionLevelDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PermissionLevel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('權限等級不存在');
    if (existing.isSystem) throw new ForbiddenException('內建權限等級不可修改');
    return this.prisma.nx01PermissionLevel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PermissionLevel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('權限等級不存在');
    if (existing.isSystem) throw new ForbiddenException('內建權限等級不可停用');
    return this.prisma.nx01PermissionLevel.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
  }

  /** 列指定等級的權限集合（UI 預填） */
  async listPermissions(user: RequestUser, levelId: string) {
    const tenantId = requireTenantId(user);
    const level = await this.prisma.nx01PermissionLevel.findFirst({
      where: { id: levelId, tenantId },
      select: { id: true, code: true, name: true, isActive: true, isSystem: true },
    });
    if (!level) throw new NotFoundException('權限等級不存在');
    const grants = await this.prisma.nx01PermissionLevelPermission.findMany({
      where: { permissionLevelId: levelId, tenantId },
      include: { permission: { select: PERM_SEL } },
    });
    return {
      levelId: level.id,
      code: level.code,
      name: level.name,
      isActive: level.isActive,
      isSystem: level.isSystem,
      permissions: grants.map((g) => g.permission),
    };
  }

  /** 替換指定等級的權限集合（PUT 語意；內建 S 不可改） */
  async setPermissions(user: RequestUser, levelId: string, permissionCodes: string[]) {
    const tenantId = requireTenantId(user);
    const level = await this.prisma.nx01PermissionLevel.findFirst({
      where: { id: levelId, tenantId },
      select: { id: true, isSystem: true },
    });
    if (!level) throw new NotFoundException('權限等級不存在');
    if (level.isSystem) {
      throw new ForbiddenException('內建權限等級（S）為全權限、不可修改');
    }
    const perms = await this.prisma.nx01Permission.findMany({
      where: { code: { in: permissionCodes }, isActive: true },
      select: { id: true, code: true },
    });
    const codeSet = new Set(permissionCodes);
    const foundCodes = new Set(perms.map((p) => p.code));
    const missing = [...codeSet].filter((c) => !foundCodes.has(c));
    if (missing.length) {
      throw new BadRequestException(`未知權限代碼: ${missing.join(', ')}`);
    }
    const desiredIds = new Set(perms.map((p) => p.id));
    const existing = await this.prisma.nx01PermissionLevelPermission.findMany({
      where: { permissionLevelId: levelId, tenantId },
      select: { id: true, permissionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.permissionId));
    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemoveRowIds = existing
      .filter((e) => !desiredIds.has(e.permissionId))
      .map((e) => e.id);

    await this.prisma.$transaction(async (tx) => {
      if (toRemoveRowIds.length) {
        await tx.nx01PermissionLevelPermission.deleteMany({
          where: { id: { in: toRemoveRowIds } },
        });
      }
      for (const pid of toAdd) {
        await tx.nx01PermissionLevelPermission.create({
          data: { tenantId, permissionLevelId: levelId, permissionId: pid, grantedBy: user.sub },
        });
      }
    });

    return { levelId, added: toAdd.length, removed: toRemoveRowIds.length, total: desiredIds.size };
  }
}
