import * as bcrypt from 'bcryptjs';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateUserDto, ListUserQueryDto, UpdateUserDto } from './dto/user.dto';

const SEL = {
  id: true,
  tenantId: true,
  employeeId: true,
  userAccount: true,
  userName: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01UserGetPayload<{ select: typeof SEL }>;

/** 列表／明細：含主要角色、倉庫摘要、建立／修改人帳號姓名 */
const LIST_SELECT = {
  ...SEL,
  createdByUser: { select: { userAccount: true, userName: true } },
  updatedByUser: { select: { userAccount: true, userName: true } },
  rev_Nx01UserRole_userId: {
    where: { isPrimary: true, isActive: true, revokedAt: null },
    take: 1,
    select: { role: { select: { name: true } } },
  },
  rev_Nx01UserWarehouse_userId: {
    where: { isActive: true, revokedAt: null },
    select: { warehouse: { select: { code: true, name: true } } },
  },
} as const;

type ListRow = Prisma.Nx01UserGetPayload<{ select: typeof LIST_SELECT }>;

export type Nx01UserPublicDto = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  jobTitle: string | null;
  warehouseSummary: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  createdAt: string;
  createdBy: string;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListUserQueryDto): Prisma.Nx01UserWhereInput {
    const where: Prisma.Nx01UserWhereInput = { tenantId };
    const and: Prisma.Nx01UserWhereInput[] = [];

    if (q.search?.trim()) {
      const s = q.search.trim();
      and.push({
        OR: [
          { userAccount: { contains: s, mode: 'insensitive' } },
          { userName: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
          {
            rev_Nx01UserRole_userId: {
              some: {
                isPrimary: true,
                isActive: true,
                revokedAt: null,
                role: { name: { contains: s, mode: 'insensitive' } },
              },
            },
          },
          {
            rev_Nx01UserWarehouse_userId: {
              some: {
                isActive: true,
                revokedAt: null,
                warehouse: {
                  OR: [
                    { code: { contains: s, mode: 'insensitive' } },
                    { name: { contains: s, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (q.primaryRoleIds?.length) {
      and.push({
        rev_Nx01UserRole_userId: {
          some: {
            tenantId,
            roleId: { in: q.primaryRoleIds },
            isActive: true,
            revokedAt: null,
          },
        },
      });
    }

    if (and.length) where.AND = and;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  private toPublicUserFromListRow(row: ListRow): Nx01UserPublicDto {
    const whRows = row.rev_Nx01UserWarehouse_userId.map((x) => x.warehouse).filter(Boolean);
    const parts = whRows.map((w) => `${w.code} ${w.name}`.trim()).filter(Boolean);
    const warehouseSummary = parts.length ? parts.join('、') : null;
    const firstWh = whRows[0];
    const primaryUr = row.rev_Nx01UserRole_userId[0];
    return {
      id: row.id,
      username: row.userAccount,
      displayName: row.userName,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      jobTitle: primaryUr?.role?.name ?? null,
      warehouseSummary,
      warehouseCode: firstWh?.code ?? null,
      warehouseName: firstWh?.name ?? null,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      createdByUsername: row.createdByUser?.userAccount ?? null,
      createdByName: row.createdByUser?.userName ?? null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      updatedByUsername: row.updatedByUser?.userAccount ?? null,
      updatedByName: row.updatedByUser?.userName ?? null,
    };
  }

  private toPublicUserFromRow(row: Row): Nx01UserPublicDto {
    return {
      id: row.id,
      username: row.userAccount,
      displayName: row.userName,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      jobTitle: null,
      warehouseSummary: null,
      warehouseCode: null,
      warehouseName: null,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      createdByUsername: null,
      createdByName: null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      updatedByUsername: null,
      updatedByName: null,
    };
  }

  async list(user: RequestUser, q: ListUserQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01User.count({ where }),
      this.prisma.nx01User.findMany({
        where,
        orderBy: { userAccount: 'asc' },
        skip,
        take: pageSize,
        select: LIST_SELECT,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.toPublicUserFromListRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: LIST_SELECT });
    if (!row) throw new NotFoundException('User not found');
    return this.toPublicUserFromListRow(row);
  }

  async create(user: RequestUser, dto: CreateUserDto) {
    const tenantId = requireTenantId(user);
    const acc = dto.userAccount.trim();
    const dup = await this.prisma.nx01User.findFirst({
      where: { tenantId, userAccount: { equals: acc, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('User account already exists in tenant');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const row = await this.prisma.nx01User.create({
      data: {
        tenantId,
        userAccount: acc,
        passwordHash,
        userName: dto.userName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
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
      entityTable: 'nx01_user',
      entityId: row.id,
      entityCode: row.userAccount,
      summary: '建立使用者',
      afterData: row as object,
    });
    return this.toPublicUserFromRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateUserDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('User not found');
    const data: Prisma.Nx01UserUncheckedUpdateInput = {
      updatedBy: user.sub,
      ...(dto.userName !== undefined ? { userName: dto.userName.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    const row = await this.prisma.nx01User.update({ where: { id }, data, select: SEL });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_user',
      entityId: id,
      entityCode: row.userAccount,
      summary: '修改使用者',
      beforeData: existing as object,
      afterData: row as object,
    });
    const full = await this.prisma.nx01User.findFirst({ where: { id: row.id, tenantId }, select: LIST_SELECT });
    return full ? this.toPublicUserFromListRow(full) : this.toPublicUserFromRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    if (id === user.sub) throw new ConflictException('Cannot deactivate self');
    const existing = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('User not found');
    const row = await this.prisma.nx01User.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_user',
      entityId: id,
      entityCode: row.userAccount,
      summary: '軟刪除使用者',
      beforeData: existing as object,
      afterData: row as object,
    });
    const full = await this.prisma.nx01User.findFirst({ where: { id: row.id, tenantId }, select: LIST_SELECT });
    return full ? this.toPublicUserFromListRow(full) : this.toPublicUserFromRow(row);
  }
}
