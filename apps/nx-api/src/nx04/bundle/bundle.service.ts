// apps/nx-api/src/nx04/bundle/bundle.service.ts
// F2 組合套餐 2026-06-09：CRUD + 套用到 SO（分攤 bundlePrice 到各 line）
//
// 業務語意（Alex Phase 2 收尾）：
//   ① Bundle = 套餐名稱 / 套餐總價 / 時段 / 啟停（CRUD）
//   ② BundleItem = 套餐組成料件 + 數量
//   ③ SO 套用：各組成料件逐項建 line、bundleId 標記、整組總價按 priceA × qty 比例分攤
//   ⚠️ line.bundleId 非空 → SoService.assertSoLinePriceReason 跳過促銷引擎檢查（避免重複折）

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  ApplyBundleToSoDto,
  CreateBundleDto,
  CreateBundleItemDto,
  ListBundleQueryDto,
  ReplaceBundleItemsDto,
  UpdateBundleDto,
} from './dto/bundle.dto';

const B_SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  bundlePrice: true,
  validFrom: true,
  validTo: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const BI_SEL = {
  id: true,
  bundleId: true,
  partId: true,
  qty: true,
  createdAt: true,
  createdBy: true,
} as const;

type Row = Prisma.Nx04BundleGetPayload<{ select: typeof B_SEL }>;
type ItemRow = Prisma.Nx04BundleItemGetPayload<{ select: typeof BI_SEL }>;

export interface AllocatedBundleLine {
  partId: string;
  partNo: string;
  partName: string;
  qty: PrismaNs.Decimal;
  unitPrice: PrismaNs.Decimal;
  lineAmount: PrismaNs.Decimal;
}

@Injectable()
export class BundleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(row: Row & { items?: (ItemRow & { part?: { code: string; name: string } | null })[] }) {
    return {
      ...row,
      bundlePrice: row.bundlePrice.toString(),
      validFrom: row.validFrom.toISOString().slice(0, 10),
      validTo: row.validTo.toISOString().slice(0, 10),
      items:
        row.items?.map((it) => ({
          ...it,
          qty: it.qty.toString(),
          partNo: it.part?.code ?? null,
          partName: it.part?.name ?? null,
        })) ?? undefined,
    };
  }

  private assertValidPeriod(from: Date, to: Date) {
    if (to < from) {
      throw new BadRequestException(
        `validTo (${to.toISOString().slice(0, 10)}) must be >= validFrom (${from.toISOString().slice(0, 10)})`,
      );
    }
  }

  private async assertPartsExist(tenantId: string, partIds: string[]): Promise<void> {
    const uniq = [...new Set(partIds)];
    const found = await this.prisma.nx01Part.findMany({
      where: { id: { in: uniq }, tenantId },
      select: { id: true },
    });
    if (found.length !== uniq.length) {
      const missing = uniq.filter((id) => !found.some((p) => p.id === id));
      throw new BadRequestException(`partId not found in tenant: ${missing.join(', ')}`);
    }
  }

  private whereList(tenantId: string, q: ListBundleQueryDto): Prisma.Nx04BundleWhereInput {
    const where: Prisma.Nx04BundleWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListBundleQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04Bundle.count({ where }),
      this.prisma.nx04Bundle.findMany({
        where,
        orderBy: [{ validFrom: 'desc' }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...B_SEL,
          items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
        },
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Bundle.findFirst({
      where: { id, tenantId },
      select: {
        ...B_SEL,
        items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Bundle not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateBundleDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx04Bundle.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`套餐代碼 ${code} 已存在`);

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);
    this.assertValidPeriod(validFrom, validTo);
    await this.assertPartsExist(tenantId, dto.items.map((i) => i.partId));

    const row = await this.prisma.$transaction(async (tx) => {
      const b = await tx.nx04Bundle.create({
        data: {
          tenantId,
          code,
          name: dto.name.trim(),
          bundlePrice: new PrismaNs.Decimal(dto.bundlePrice),
          validFrom,
          validTo,
          isActive: dto.isActive ?? true,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: B_SEL,
      });
      for (const it of dto.items) {
        await tx.nx04BundleItem.create({
          data: {
            tenantId,
            bundleId: b.id,
            partId: it.partId.trim(),
            qty: new PrismaNs.Decimal(it.qty),
            createdBy: user.sub,
          },
        });
      }
      const full = await tx.nx04Bundle.findFirst({
        where: { id: b.id },
        select: {
          ...B_SEL,
          items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
        },
      });
      return full!;
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_bundle',
      entityId: row.id,
      entityCode: row.code,
      summary: `建立套餐（${dto.items.length} 組成料件）`,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateBundleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Bundle.findFirst({ where: { id, tenantId }, select: B_SEL });
    if (!existing) throw new NotFoundException('Bundle not found');

    if (dto.validFrom !== undefined || dto.validTo !== undefined) {
      const from = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
      const to = dto.validTo ? new Date(dto.validTo) : existing.validTo;
      this.assertValidPeriod(from, to);
    }

    const row = await this.prisma.nx04Bundle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.bundlePrice !== undefined ? { bundlePrice: new PrismaNs.Decimal(dto.bundlePrice) } : {}),
        ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validTo !== undefined ? { validTo: new Date(dto.validTo) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: {
        ...B_SEL,
        items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_bundle',
      entityId: id,
      entityCode: row.code,
      summary: '修改套餐',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Bundle.findFirst({ where: { id, tenantId }, select: B_SEL });
    if (!existing) throw new NotFoundException('Bundle not found');
    const row = await this.prisma.nx04Bundle.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: {
        ...B_SEL,
        items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_bundle',
      entityId: id,
      entityCode: row.code,
      summary: '停用套餐',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async replaceItems(user: RequestUser, id: string, dto: ReplaceBundleItemsDto) {
    const tenantId = requireTenantId(user);
    const b = await this.prisma.nx04Bundle.findFirst({ where: { id, tenantId }, select: B_SEL });
    if (!b) throw new NotFoundException('Bundle not found');
    await this.assertPartsExist(tenantId, dto.items.map((i) => i.partId));

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.nx04BundleItem.deleteMany({ where: { tenantId, bundleId: id } });
      for (const it of dto.items) {
        await tx.nx04BundleItem.create({
          data: {
            tenantId,
            bundleId: id,
            partId: it.partId.trim(),
            qty: new PrismaNs.Decimal(it.qty),
            createdBy: user.sub,
          },
        });
      }
      return tx.nx04Bundle.findFirst({
        where: { id },
        select: {
          ...B_SEL,
          items: { select: { ...BI_SEL, part: { select: { code: true, name: true } } } },
        },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_bundle',
      entityId: id,
      entityCode: b.code,
      summary: `重設套餐組成（${dto.items.length} 項）`,
      afterData: row as object,
    });
    return this.mapRow(row!);
  }

  /**
   * 套餐分攤：bundlePrice 按 (bundleItem.qty × part.priceA) 比例分到各 line。
   * priceA 全 0 或 null → 退回平均分攤（lineAmount = bundlePrice / itemCount）。
   * lineAmount = share × bundlePrice；unitPrice = lineAmount / qty（DECIMAL(14, 4)）。
   */
  async allocateBundleLines(tenantId: string, bundleId: string): Promise<{
    bundleCode: string;
    bundlePrice: PrismaNs.Decimal;
    lines: AllocatedBundleLine[];
  }> {
    const bundle = await this.prisma.nx04Bundle.findFirst({
      where: { id: bundleId, tenantId, isActive: true },
      select: {
        id: true,
        code: true,
        bundlePrice: true,
        validFrom: true,
        validTo: true,
        items: {
          select: {
            partId: true,
            qty: true,
            part: { select: { code: true, name: true, priceA: true } },
          },
        },
      },
    });
    if (!bundle) throw new NotFoundException('Bundle not found / inactive');
    const today = new Date(new Date().toISOString().slice(0, 10));
    if (bundle.validFrom > today || bundle.validTo < today) {
      throw new BadRequestException(
        `Bundle 不在生效時段（${bundle.validFrom.toISOString().slice(0, 10)} ~ ${bundle.validTo
          .toISOString()
          .slice(0, 10)}）`,
      );
    }
    if (bundle.items.length === 0) {
      throw new BadRequestException('Bundle 沒有任何組成料件');
    }

    const totalPrice = new PrismaNs.Decimal(bundle.bundlePrice);

    // 計算分母 = sum(qty × priceA)
    let denom = new PrismaNs.Decimal(0);
    for (const it of bundle.items) {
      const priceA = it.part?.priceA ? new PrismaNs.Decimal(it.part.priceA) : new PrismaNs.Decimal(0);
      denom = denom.add(new PrismaNs.Decimal(it.qty).mul(priceA));
    }
    const equalShare = denom.lte(0); // priceA 全 0 → 平均分

    const lines: AllocatedBundleLine[] = bundle.items.map((it, idx) => {
      const qty = new PrismaNs.Decimal(it.qty);
      const priceA = it.part?.priceA ? new PrismaNs.Decimal(it.part.priceA) : new PrismaNs.Decimal(0);
      let lineAmount: PrismaNs.Decimal;
      if (equalShare) {
        lineAmount = totalPrice.div(bundle.items.length).toDecimalPlaces(2);
      } else {
        const share = qty.mul(priceA).div(denom);
        lineAmount = share.mul(totalPrice).toDecimalPlaces(2);
      }
      // 最後一行吸收尾差、確保總和 = bundlePrice
      // (記在 loop 外、用 reduce 拿到目前已分配總額)
      return {
        partId: it.partId,
        partNo: it.part?.code ?? '',
        partName: it.part?.name ?? '',
        qty,
        unitPrice: qty.gt(0) ? lineAmount.div(qty).toDecimalPlaces(4) : new PrismaNs.Decimal(0),
        lineAmount,
        _idx: idx,
      } as AllocatedBundleLine & { _idx: number };
    });
    // 尾差吸收：所有 lineAmount 累加 ≠ bundlePrice 時、把差額補在最後一行
    const sum = lines.reduce((acc, l) => acc.add(l.lineAmount), new PrismaNs.Decimal(0));
    const diff = totalPrice.sub(sum);
    if (!diff.eq(0)) {
      const last = lines[lines.length - 1];
      last.lineAmount = last.lineAmount.add(diff).toDecimalPlaces(2);
      last.unitPrice = last.qty.gt(0)
        ? last.lineAmount.div(last.qty).toDecimalPlaces(4)
        : new PrismaNs.Decimal(0);
    }
    return { bundleCode: bundle.code, bundlePrice: totalPrice, lines };
  }
}
