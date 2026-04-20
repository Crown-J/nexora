import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePartDto, ListPartQueryDto, UpdatePartDto } from './dto/part.dto';

const SEL = {
  id: true,
  tenantId: true,
  codeRuleId: true,
  code: true,
  name: true,
  isOem: true,
  secCode: true,
  seg1: true,
  seg2: true,
  seg3: true,
  seg4: true,
  seg5: true,
  countryId: true,
  partBrandId: true,
  type: true,
  partGroupId: true,
  spec: true,
  uom: true,
  isActive: true,
  returnPolicy: true,
  warrantyMonths: true,
  priceA: true,
  priceB: true,
  priceC: true,
  priceD: true,
  priceUpdatedAt: true,
  priceUpdatedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01PartGetPayload<{ select: typeof SEL }>;

function trimOrNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t === '' ? null : t;
}

function decimalStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    return (v as { toString(): string }).toString();
  }
  return String(v);
}

@Injectable()
export class PartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private async resolveCodeRuleId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    partBrandId: string | undefined,
    codeRuleId: string | undefined,
  ): Promise<string> {
    if (codeRuleId?.trim()) {
      const r = await tx.nx01BrandCodeRule.findFirst({
        where: { id: codeRuleId.trim(), tenantId },
        select: { id: true },
      });
      if (!r) throw new NotFoundException('codeRuleId not found for tenant');
      return r.id;
    }
    if (!partBrandId?.trim()) {
      throw new BadRequestException('Either codeRuleId or partBrandId is required');
    }
    const pb = partBrandId.trim();
    const existing = await tx.nx01BrandCodeRule.findFirst({
      where: { tenantId, partBrandId: pb },
      select: { id: true },
    });
    if (existing) return existing.id;
    const brand = await tx.nx01PartBrand.findFirst({ where: { id: pb, tenantId }, select: { code: true } });
    if (!brand) throw new NotFoundException('partBrandId not found');
    const name = brand.code.length > 15 ? brand.code.slice(0, 15) : brand.code;
    const created = await tx.nx01BrandCodeRule.create({
      data: {
        tenantId,
        partBrandId: pb,
        name,
        createdBy: userId,
        updatedBy: userId,
      },
      select: { id: true },
    });
    return created.id;
  }

  private whereList(tenantId: string, q: ListPartQueryDto): Prisma.Nx01PartWhereInput {
    const where: Prisma.Nx01PartWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { secCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Part.count({ where }),
      this.prisma.nx01Part.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.$transaction(async (tx) => {
      const codeRuleId = await this.resolveCodeRuleId(
        tx,
        tenantId,
        user.sub,
        dto.partBrandId,
        dto.codeRuleId,
      );
      return tx.nx01Part.create({
        data: {
          tenantId,
          codeRuleId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          isOem: dto.isOem ?? true,
          secCode: trimOrNull(dto.secCode),
          seg1: trimOrNull(dto.seg1),
          seg2: trimOrNull(dto.seg2),
          seg3: trimOrNull(dto.seg3),
          seg4: trimOrNull(dto.seg4),
          seg5: trimOrNull(dto.seg5),
          countryId: dto.countryId?.trim() || null,
          partBrandId: dto.partBrandId?.trim() || null,
          partGroupId: dto.partGroupId?.trim() || null,
          type: dto.partType?.trim() || 'A',
          spec: dto.spec?.trim() || null,
          uom: dto.uom?.trim() || 'pcs',
          isActive: dto.isActive ?? true,
          returnPolicy: dto.returnPolicy?.trim() || 'S',
          warrantyMonths: dto.warrantyMonths ?? 0,
          priceA: dto.priceA ?? 0,
          priceB: dto.priceB ?? 0,
          priceC: dto.priceC ?? 0,
          priceD: dto.priceD ?? 0,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_part',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立料號',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePartDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part not found');

    const priceTouched =
      dto.priceA !== undefined ||
      dto.priceB !== undefined ||
      dto.priceC !== undefined ||
      dto.priceD !== undefined;

    const row = await this.prisma.nx01Part.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isOem !== undefined ? { isOem: dto.isOem } : {}),
        ...(dto.secCode !== undefined ? { secCode: trimOrNull(dto.secCode) } : {}),
        ...(dto.seg1 !== undefined ? { seg1: trimOrNull(dto.seg1) } : {}),
        ...(dto.seg2 !== undefined ? { seg2: trimOrNull(dto.seg2) } : {}),
        ...(dto.seg3 !== undefined ? { seg3: trimOrNull(dto.seg3) } : {}),
        ...(dto.seg4 !== undefined ? { seg4: trimOrNull(dto.seg4) } : {}),
        ...(dto.seg5 !== undefined ? { seg5: trimOrNull(dto.seg5) } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId?.trim() || null } : {}),
        ...(dto.partBrandId !== undefined ? { partBrandId: dto.partBrandId?.trim() || null } : {}),
        ...(dto.partGroupId !== undefined ? { partGroupId: dto.partGroupId?.trim() || null } : {}),
        ...(dto.partType !== undefined
          ? { type: dto.partType === null || dto.partType === '' ? 'A' : dto.partType.trim() }
          : {}),
        ...(dto.spec !== undefined ? { spec: dto.spec } : {}),
        ...(dto.uom !== undefined ? { uom: dto.uom.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.returnPolicy !== undefined ? { returnPolicy: dto.returnPolicy.trim() } : {}),
        ...(dto.warrantyMonths !== undefined ? { warrantyMonths: dto.warrantyMonths } : {}),
        ...(dto.priceA !== undefined ? { priceA: dto.priceA } : {}),
        ...(dto.priceB !== undefined ? { priceB: dto.priceB } : {}),
        ...(dto.priceC !== undefined ? { priceC: dto.priceC } : {}),
        ...(dto.priceD !== undefined ? { priceD: dto.priceD } : {}),
        ...(priceTouched ? { priceUpdatedAt: new Date(), priceUpdatedBy: user.sub } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part',
      entityId: id,
      entityCode: row.code,
      summary: '修改料號',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part not found');
    const row = await this.prisma.nx01Part.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除料號',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { type, priceA, priceB, priceC, priceD, ...rest } = row;
    return {
      ...rest,
      partType: type,
      priceA: decimalStr(priceA),
      priceB: decimalStr(priceB),
      priceC: decimalStr(priceC),
      priceD: decimalStr(priceD),
    };
  }
}
