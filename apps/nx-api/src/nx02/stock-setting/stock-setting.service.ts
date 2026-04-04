/**
 * File: apps/nx-api/src/nx02/stock-setting/stock-setting.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-SVC-001：庫存設定 CRUD；reorderQty = max(0, maxQty - onHand)
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import type {
  PatchStockSettingBodyDto,
  UpsertStockSettingBodyDto,
} from './dto/stock-setting.dto';

function d(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

function computeReorder(maxQty: Prisma.Decimal, onHand: Prisma.Decimal): Prisma.Decimal {
  if (maxQty.lte(0)) return d(0);
  const diff = maxQty.sub(onHand);
  return diff.gt(0) ? diff : d(0);
}

@Injectable()
export class StockSettingService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-STKG-SVC-001-F01
   */
  async list(
    tenantId: string,
    opts: {
      q?: string;
      warehouseId?: string;
      hasMinQty?: boolean;
      page: number;
      pageSize: number;
    },
  ) {
    const partWhere: Prisma.Nx00PartWhereInput | undefined =
      opts.q?.trim()
        ? {
          OR: [
            { code: { contains: opts.q.trim(), mode: 'insensitive' } },
            { name: { contains: opts.q.trim(), mode: 'insensitive' } },
          ],
        }
        : undefined;

    const where: Prisma.Nx02PartStockSettingWhereInput = {
      tenantId,
      ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
      ...(opts.hasMinQty ? { minQty: { gt: d(0) } } : {}),
      ...(partWhere ? { part: partWhere } : {}),
    };

    const skip = (opts.page - 1) * opts.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx02PartStockSetting.count({ where }),
      this.prisma.nx02PartStockSetting.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: opts.pageSize,
        include: {
          part: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    const keys = rows.map((r) => ({
      tenantId,
      partId: r.partId,
      warehouseId: r.warehouseId,
    }));
    const balances =
      keys.length === 0
        ? []
        : await this.prisma.nx02StockBalance.findMany({
          where: {
            OR: keys.map((k) => ({
              tenantId: k.tenantId,
              partId: k.partId,
              warehouseId: k.warehouseId,
            })),
          },
        });
    const balMap = new Map(
      balances.map((b) => [`${b.partId}|${b.warehouseId}`, b]),
    );

    const data = rows.map((r) => {
      const b = balMap.get(`${r.partId}|${r.warehouseId}`);
      const onHand = b?.onHandQty ?? d(0);
      const avail = b?.availableQty ?? d(0);
      const minQ = r.minQty;
      const isShortage = minQ.gt(0) && onHand.lt(minQ);
      return {
        id: r.id,
        partId: r.partId,
        partCode: r.part.code,
        partName: r.part.name,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouse.name,
        minQty: r.minQty.toNumber(),
        maxQty: r.maxQty.toNumber(),
        reorderQty: r.reorderQty.toNumber(),
        onHandQty: onHand.toNumber(),
        availableQty: avail.toNumber(),
        isShortage,
        isActive: r.isActive,
        remark: r.remark,
      };
    });

    return { data, total, page: opts.page, pageSize: opts.pageSize };
  }

  /**
   * @FUNCTION_CODE NX02-STKG-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const r = await this.prisma.nx02PartStockSetting.findFirst({
      where: { id, tenantId },
      include: {
        part: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
    if (!r) throw new NotFoundException('庫存設定不存在');
    const b = await this.prisma.nx02StockBalance.findUnique({
      where: {
        tenantId_partId_warehouseId: {
          tenantId,
          partId: r.partId,
          warehouseId: r.warehouseId,
        },
      },
    });
    const onHand = b?.onHandQty ?? d(0);
    const avail = b?.availableQty ?? d(0);
    const minQ = r.minQty;
    return {
      id: r.id,
      partId: r.partId,
      partCode: r.part.code,
      partName: r.part.name,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouse.name,
      minQty: r.minQty.toNumber(),
      maxQty: r.maxQty.toNumber(),
      reorderQty: r.reorderQty.toNumber(),
      onHandQty: onHand.toNumber(),
      availableQty: avail.toNumber(),
      isShortage: minQ.gt(0) && onHand.lt(minQ),
      isActive: r.isActive,
      remark: r.remark,
    };
  }

  private async onHandFor(tenantId: string, partId: string, warehouseId: string) {
    const b = await this.prisma.nx02StockBalance.findUnique({
      where: {
        tenantId_partId_warehouseId: { tenantId, partId, warehouseId },
      },
    });
    return b?.onHandQty ?? d(0);
  }

  /**
   * @FUNCTION_CODE NX02-STKG-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: UpsertStockSettingBodyDto) {
    const partId = body.partId.trim();
    const warehouseId = body.warehouseId.trim();
    const minQty = d(body.minQty);
    const maxQty = d(body.maxQty);
    if (minQty.lt(0) || maxQty.lt(0)) throw new BadRequestException('minQty / maxQty 不可為負');

    const [part, wh] = await Promise.all([
      this.prisma.nx00Part.findFirst({
        where: { id: partId, tenantId, isActive: true },
        select: { id: true },
      }),
      this.prisma.nx00Warehouse.findFirst({
        where: { id: warehouseId, tenantId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!part) throw new BadRequestException('零件不存在');
    if (!wh) throw new BadRequestException('倉庫不存在');

    const onHand = await this.onHandFor(tenantId, partId, warehouseId);
    const reorderQty = computeReorder(maxQty, onHand);

    try {
      const row = await this.prisma.nx02PartStockSetting.create({
        data: {
          tenantId,
          partId,
          warehouseId,
          minQty,
          maxQty,
          reorderQty,
          isActive: body.isActive !== false,
          remark: body.remark?.trim() ? body.remark.trim() : null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        },
      });
      return this.getById(tenantId, row.id);
    } catch (e: unknown) {
      const pe = e as { code?: string };
      if (pe.code === 'P2002') {
        throw new BadRequestException('此料號與倉庫已有庫存設定');
      }
      throw e;
    }
  }

  /**
   * @FUNCTION_CODE NX02-STKG-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchStockSettingBodyDto) {
    const existing = await this.prisma.nx02PartStockSetting.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('庫存設定不存在');

    const minQty = body.minQty !== undefined ? d(body.minQty) : existing.minQty;
    const maxQty = body.maxQty !== undefined ? d(body.maxQty) : existing.maxQty;
    if (minQty.lt(0) || maxQty.lt(0)) throw new BadRequestException('minQty / maxQty 不可為負');

    const onHand = await this.onHandFor(tenantId, existing.partId, existing.warehouseId);
    const reorderQty = computeReorder(maxQty, onHand);

    await this.prisma.nx02PartStockSetting.update({
      where: { id },
      data: {
        minQty,
        maxQty,
        reorderQty,
        ...(body.remark !== undefined
          ? { remark: body.remark?.trim() ? body.remark.trim() : null }
          : {}),
        updatedBy: userId ?? null,
      },
    });
    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-STKG-SVC-001-F05
   */
  async setActive(tenantId: string, userId: string | undefined, id: string, isActive: boolean) {
    const existing = await this.prisma.nx02PartStockSetting.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('庫存設定不存在');
    await this.prisma.nx02PartStockSetting.update({
      where: { id },
      data: { isActive, updatedBy: userId ?? null },
    });
    return this.getById(tenantId, id);
  }
}
