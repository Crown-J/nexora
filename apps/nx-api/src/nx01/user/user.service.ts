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

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListUserQueryDto): Prisma.Nx01UserWhereInput {
    const where: Prisma.Nx01UserWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { userAccount: { contains: s, mode: 'insensitive' } },
        { userName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
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
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('User not found');
    return this.mapRow(row);
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
    return this.mapRow(row);
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
    return this.mapRow(row);
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
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
