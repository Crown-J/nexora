// apps/nx-api/src/nx05/account-code/account-code.service.ts
// NX05 AccountCode service（會計科目主檔 CRUD）
//
// 對齊：
//   - overview §4 AccountCode 主檔範式（Crown Q5=b + Q6=a）
//   - audit-01 §4.3 揭露的「AccountCode 0 controller」缺口補完
//   - 既有 schema Nx05AccountCode（line 3902、4 category I/E/A/L、isSystem 保護）
//
// 業務語意：
//   - seed 預設 95 科目（M1 migration、isSystem=true）
//   - 用戶可改：name + isActive + remark（不可改 code / category、要改重建）
//   - isSystem=true 不可硬刪、軟刪除 isActive=false
//
// 範式：對齊 NX02 PartnerPartService + AR BrandAllocationRuleService

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
  AccountCodeListQueryDto,
  CreateAccountCodeDto,
  UpdateAccountCodeDto,
} from './dto/account-code.dto';

const AC_SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  category: true,
  isSystem: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class AccountCodeService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(
    tenantId: string,
    q: AccountCodeListQueryDto,
  ): Prisma.Nx05AccountCodeWhereInput {
    const where: Prisma.Nx05AccountCodeWhereInput = { tenantId };
    if (q.category) where.category = q.category;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.isSystem !== undefined) where.isSystem = q.isSystem;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(user: RequestUser, q: AccountCodeListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100; // 科目通常 100~200 個、預設較大
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05AccountCode.count({ where }),
      this.prisma.nx05AccountCode.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: AC_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05AccountCode.findFirst({
      where: { id, tenantId },
      select: AC_SEL,
    });
    if (!row) throw new NotFoundException('AccountCode not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateAccountCodeDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const code = dto.code.trim();
    if (!code) throw new BadRequestException('code is required');

    // schema unique [tenantId, code] dup check（提前 throw 友善訊息）
    const dup = await this.prisma.nx05AccountCode.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException(
        `AccountCode code='${code}' already exists in tenant (id=${dup.id})`,
      );
    }

    return this.prisma.nx05AccountCode.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        category: dto.category,
        isSystem: false, // 用戶手動建一律 isSystem=false
        isActive: true,
        remark: dto.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
      select: AC_SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateAccountCodeDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const existing = await this.prisma.nx05AccountCode.findFirst({
      where: { id, tenantId },
      select: AC_SEL,
    });
    if (!existing) throw new NotFoundException('AccountCode not found');

    const data: Prisma.Nx05AccountCodeUpdateInput = { updatedBy: userId };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.remark !== undefined) data.remark = dto.remark?.trim() || null;

    return this.prisma.nx05AccountCode.update({
      where: { id },
      data,
      select: AC_SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const existing = await this.prisma.nx05AccountCode.findFirst({
      where: { id, tenantId },
      select: { id: true, isSystem: true, isActive: true, code: true },
    });
    if (!existing) throw new NotFoundException('AccountCode not found');

    // isSystem=true 不可硬刪、軟刪除 isActive=false（對齊 schema 註解 line 3914）
    // 已用過的科目（被 Paylog FK 引用）也應該不可硬刪、純軟刪除
    if (!existing.isActive) return { ok: true, alreadyInactive: true };

    await this.prisma.nx05AccountCode.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
    return { ok: true, code: existing.code };
  }
}
