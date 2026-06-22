// apps/nx-api/src/nx02/partner-part/partner-part.service.ts
// NX02 PartnerPart service（partner ↔ part 中間表 CRUD）
// 對齊 nx02-overview §4 混合範式 + Crown Q-PP-1=C / Q-PP-2=a / Q-PP-3=b / Q-S3=A
//
// 校驗範式（application 自律）：
//   - partner 必存在 + tenant 一致
//   - partner_type='S' 純供應商 guard（Q-PP-2=a 不在 DB 強制、application 層提示性 throw；partner 改制六分類後 S 收斂為「純賣方正規來源」）
//   - part 必存在 + tenant 一致
//   - validFrom < validTo（若 validTo 非空）
//   - unique [tenantId, partnerId, partId, validFrom]（schema 強制 + service 友善 throw）

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreatePartnerPartDto,
  PartnerPartListQueryDto,
  UpdatePartnerPartDto,
} from './dto/partner-part.dto';

const PP_SEL = {
  id: true,
  tenantId: true,
  partnerId: true,
  partId: true,
  isPrimary: true,
  supplierPartNo: true,
  defaultUnitCost: true,
  defaultLeadDays: true,
  moq: true,
  source: true,
  validFrom: true,
  validTo: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PartnerPartService {
  constructor(private readonly prisma: PrismaService) {}

  /** 校驗 validFrom < validTo（若 validTo 非空）。 */
  private assertValidPeriod(from: Date | null, to: Date | null) {
    if (from && to && to <= from) {
      throw new BadRequestException(
        `validFrom (${from.toISOString().slice(0, 10)}) must be < validTo (${to.toISOString().slice(0, 10)})`,
      );
    }
  }

  /** 校驗 partner 存在 + tenant 一致 + partner_type='S' 純供應商（Q-PP-2=a application guard）。 */
  private async assertPartnerIsSupplier(tenantId: string, partnerId: string) {
    const partner = await this.prisma.nx01Partner.findFirst({
      where: { id: partnerId, tenantId },
      select: { id: true, partnerType: true, isActive: true },
    });
    if (!partner) {
      throw new BadRequestException(`partnerId not found in tenant`);
    }
    if (partner.partnerType !== 'S') {
      throw new BadRequestException(
        `partnerId must be partner_type='S' (純供應商), got '${partner.partnerType}'`,
      );
    }
    if (!partner.isActive) {
      throw new BadRequestException(`partnerId is inactive`);
    }
  }

  /** 校驗 part 存在 + tenant 一致。 */
  private async assertPartExists(tenantId: string, partId: string) {
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, isActive: true },
    });
    if (!part) {
      throw new BadRequestException(`partId not found in tenant`);
    }
    if (!part.isActive) {
      throw new BadRequestException(`partId is inactive`);
    }
  }

  private whereList(
    tenantId: string,
    q: PartnerPartListQueryDto,
  ): Prisma.Nx02PartnerPartWhereInput {
    const where: Prisma.Nx02PartnerPartWhereInput = { tenantId };
    if (q.partnerId?.trim()) where.partnerId = q.partnerId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.source) where.source = q.source;
    if (q.isPrimary !== undefined) where.isPrimary = q.isPrimary;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { remark: { contains: s, mode: 'insensitive' } },
        { supplierPartNo: { contains: s, mode: 'insensitive' } },
        { partner: { name: { contains: s, mode: 'insensitive' } } },
        { partner: { code: { contains: s, mode: 'insensitive' } } },
        { part: { name: { contains: s, mode: 'insensitive' } } },
        { part: { code: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  async list(user: RequestUser, q: PartnerPartListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02PartnerPart.count({ where }),
      this.prisma.nx02PartnerPart.findMany({
        where,
        orderBy: [
          { isPrimary: 'desc' },
          { partnerId: 'asc' },
          { partId: 'asc' },
          { validFrom: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...PP_SEL,
          partner: { select: { code: true, name: true, partnerType: true } },
          part: {
          select: {
            code: true,
            name: true,
            brandId: true,
            brand: { select: { code: true, name: true } },
          },
        },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02PartnerPart.findFirst({
      where: { id, tenantId },
      select: {
        ...PP_SEL,
        partner: { select: { code: true, name: true, partnerType: true } },
        part: {
          select: {
            code: true,
            name: true,
            brandId: true,
            brand: { select: { code: true, name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('PartnerPart not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePartnerPartDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const partnerId = dto.partnerId.trim();
    const partId = dto.partId.trim();

    await this.assertPartnerIsSupplier(tenantId, partnerId);
    await this.assertPartExists(tenantId, partId);

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    this.assertValidPeriod(validFrom, validTo);

    // schema unique [tenantId, partnerId, partId, validFrom] 校驗（提前 throw 友善訊息）
    const dup = await this.prisma.nx02PartnerPart.findFirst({
      where: { tenantId, partnerId, partId, validFrom },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException(
        `PartnerPart already exists for partnerId=${partnerId} partId=${partId} validFrom=${dto.validFrom ?? 'null'} (id=${dup.id})`,
      );
    }

    return this.prisma.nx02PartnerPart.create({
      data: {
        tenantId,
        partnerId,
        partId,
        isPrimary: dto.isPrimary ?? false,
        supplierPartNo: dto.supplierPartNo?.trim() || null,
        defaultUnitCost:
          dto.defaultUnitCost !== undefined ? new PrismaNs.Decimal(dto.defaultUnitCost) : null,
        defaultLeadDays: dto.defaultLeadDays ?? null,
        moq: dto.moq !== undefined ? new PrismaNs.Decimal(dto.moq) : null,
        source: dto.source ?? 'M', // manual create 預設 'M'、cron sync 才用 'S'
        validFrom,
        validTo,
        isActive: true,
        remark: dto.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
      select: PP_SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePartnerPartDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const existing = await this.prisma.nx02PartnerPart.findFirst({
      where: { id, tenantId },
      select: PP_SEL,
    });
    if (!existing) throw new NotFoundException('PartnerPart not found');

    // validTo 變更時、校驗 validFrom < validTo
    if (dto.validTo !== undefined) {
      const nextTo = dto.validTo ? new Date(dto.validTo) : null;
      this.assertValidPeriod(existing.validFrom, nextTo);
    }

    const data: Prisma.Nx02PartnerPartUpdateInput = { updatedBy: userId };
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
    if (dto.supplierPartNo !== undefined) data.supplierPartNo = dto.supplierPartNo?.trim() || null;
    if (dto.defaultUnitCost !== undefined)
      data.defaultUnitCost = new PrismaNs.Decimal(dto.defaultUnitCost);
    if (dto.defaultLeadDays !== undefined) data.defaultLeadDays = dto.defaultLeadDays;
    if (dto.moq !== undefined) data.moq = new PrismaNs.Decimal(dto.moq);
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.validTo !== undefined) data.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.remark !== undefined) data.remark = dto.remark?.trim() || null;

    return this.prisma.nx02PartnerPart.update({
      where: { id },
      data,
      select: PP_SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;
    const existing = await this.prisma.nx02PartnerPart.findFirst({
      where: { id, tenantId },
      select: { id: true, isActive: true },
    });
    if (!existing) throw new NotFoundException('PartnerPart not found');
    if (!existing.isActive) return { ok: true, alreadyInactive: true };
    await this.prisma.nx02PartnerPart.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
    return { ok: true };
  }
}
