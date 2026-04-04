/**
 * File: apps/nx-api/src/nx02/init/init.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-SVC-001：開帳存 CRUD、過帳（加權均價）、作廢
 *
 * Notes:
 * - 過帳於 Prisma transaction；寫 ledger + upsert balance
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { allocateInitDocNo } from '../utils/nx02-doc-no';
import { resolveLedgerLocationId } from '../utils/nx02-resolve-location';

import type { CreateInitBodyDto, InitItemInputDto, PatchInitBodyDto } from './dto/init.dto';

function d(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

function parseYmd(s: string): Date {
  const t = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) throw new BadRequestException('initDate must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
}

function movementDateFromInitDate(initDate: Date): Date {
  return new Date(
    Date.UTC(
      initDate.getUTCFullYear(),
      initDate.getUTCMonth(),
      initDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function roundMoney2(x: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(x.toFixed(2, Prisma.Decimal.ROUND_HALF_UP));
}

/** 與 getById findFirst 的 include 一致，供 mapInitRowToDetail 使用 */
const initDetailInclude = {
  warehouse: { select: { id: true, code: true, name: true } as const },
  items: { orderBy: { lineNo: 'asc' as const } },
} as const;

type InitDetailRow = Prisma.Nx02InitGetPayload<{ include: typeof initDetailInclude }>;

@Injectable()
export class InitService {
  constructor(private readonly prisma: PrismaService) { }

  private mapInitRowToDetail(row: InitDetailRow) {
    return {
      id: row.id,
      docNo: row.docNo,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      initDate: row.initDate.toISOString().slice(0, 10),
      status: row.status,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      items: row.items.map((it) => ({
        id: it.id,
        lineNo: it.lineNo,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        locationId: it.locationId,
        qty: it.qty.toNumber(),
        unitCost: it.unitCost.toNumber(),
        totalCost: it.totalCost.toNumber(),
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F01
   */
  async list(
    tenantId: string,
    opts: {
      warehouseId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const where: Prisma.Nx02InitWhereInput = { tenantId };
    if (opts.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts.status && ['D', 'P', 'V'].includes(opts.status)) where.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      where.initDate = {};
      if (opts.dateFrom) where.initDate.gte = parseYmd(opts.dateFrom);
      if (opts.dateTo) where.initDate.lte = parseYmd(opts.dateTo);
    }
    const skip = (opts.page - 1) * opts.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx02Init.count({ where }),
      this.prisma.nx02Init.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: opts.pageSize,
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouse.name,
      initDate: r.initDate.toISOString().slice(0, 10),
      itemCount: r._count.items,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
    return { data, total, page: opts.page, pageSize: opts.pageSize };
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx02Init.findFirst({
      where: { id, tenantId },
      include: initDetailInclude,
    });
    if (!row) throw new NotFoundException('開帳存不存在');
    return this.mapInitRowToDetail(row);
  }

  private async assertWarehouse(tenantId: string, warehouseId: string) {
    const w = await this.prisma.nx00Warehouse.findFirst({
      where: { id: warehouseId, tenantId, isActive: true },
      select: { id: true, code: true },
    });
    if (!w) throw new BadRequestException('倉庫不存在或已停用');
    return w;
  }

  private async assertPart(tenantId: string, partId: string) {
    const p = await this.prisma.nx00Part.findFirst({
      where: { id: partId, tenantId, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!p) throw new BadRequestException(`零件不存在：${partId}`);
    return p;
  }

  private buildItemsPayload(
    tenantId: string,
    warehouseId: string,
    inputs: InitItemInputDto[],
  ): Promise<
    {
      partId: string;
      partNo: string;
      partName: string;
      locationId: string | null;
      qty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      totalCost: Prisma.Decimal;
      remark: string | null;
    }[]
  > {
    if (!inputs?.length) throw new BadRequestException('至少一筆明細');
    return Promise.all(
      inputs.map(async (it, idx) => {
        const qty = d(it.qty);
        const uc = d(it.unitCost);
        if (qty.lte(0)) throw new BadRequestException(`第 ${idx + 1} 行數量須 > 0`);
        if (uc.lte(0)) throw new BadRequestException(`第 ${idx + 1} 行均價須 > 0`);
        const part = await this.assertPart(tenantId, it.partId.trim());
        let locId: string | null = null;
        if (it.locationId?.trim()) {
          const loc = await this.prisma.nx00Location.findFirst({
            where: {
              id: it.locationId.trim(),
              tenantId,
              warehouseId,
              isActive: true,
            },
            select: { id: true },
          });
          if (!loc) throw new BadRequestException(`第 ${idx + 1} 行庫位無效`);
          locId = loc.id;
        }
        const totalCost = roundMoney2(qty.mul(uc));
        return {
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          locationId: locId,
          qty,
          unitCost: uc,
          totalCost,
          remark: it.remark?.trim() ? it.remark.trim() : null,
        };
      }),
    );
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateInitBodyDto) {
    const wh = await this.assertWarehouse(tenantId, body.warehouseId.trim());
    const initDate = parseYmd(body.initDate);
    const payloads = await this.buildItemsPayload(tenantId, wh.id, body.items);

    return this.prisma.$transaction(async (tx) => {
      const docNo = await allocateInitDocNo(tx, tenantId, initDate, wh.code);
      const doc = await tx.nx02Init.create({
        data: {
          tenantId,
          docNo,
          initDate,
          warehouseId: wh.id,
          status: 'D',
          remark: body.remark?.trim() ? body.remark.trim() : null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: payloads.map((p, i) => ({
              lineNo: i + 1,
              partId: p.partId,
              partNo: p.partNo,
              partName: p.partName,
              locationId: p.locationId,
              qty: p.qty,
              unitCost: p.unitCost,
              totalCost: p.totalCost,
              remark: p.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            })),
          },
        },
      });
      const row = await tx.nx02Init.findFirst({
        where: { id: doc.id, tenantId },
        include: initDetailInclude,
      });
      if (!row) throw new NotFoundException('開帳存不存在');
      return this.mapInitRowToDetail(row);
    });
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchInitBodyDto) {
    const existing = await this.prisma.nx02Init.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('開帳存不存在');
    if (existing.status !== 'D') throw new BadRequestException('僅草稿可修改');

    const initDate = body.initDate ? parseYmd(body.initDate) : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (body.items) {
        const payloads = await this.buildItemsPayload(tenantId, existing.warehouseId, body.items);
        await tx.nx02InitItem.deleteMany({ where: { initId: id } });
        let line = 1;
        for (const p of payloads) {
          await tx.nx02InitItem.create({
            data: {
              initId: id,
              lineNo: line++,
              partId: p.partId,
              partNo: p.partNo,
              partName: p.partName,
              locationId: p.locationId,
              qty: p.qty,
              unitCost: p.unitCost,
              totalCost: p.totalCost,
              remark: p.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
      }

      await tx.nx02Init.update({
        where: { id },
        data: {
          ...(initDate ? { initDate } : {}),
          ...(body.remark !== undefined
            ? { remark: body.remark?.trim() ? body.remark.trim() : null }
            : {}),
          updatedBy: userId ?? null,
        },
      });

      const row = await tx.nx02Init.findFirst({
        where: { id, tenantId },
        include: initDetailInclude,
      });
      if (!row) throw new NotFoundException('開帳存不存在');
      return this.mapInitRowToDetail(row);
    });
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F05
   */
  async post(tenantId: string, userId: string | undefined, id: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx02Init.findFirst({
        where: { id, tenantId },
        include: { items: true, warehouse: true },
      });
      if (!doc) throw new NotFoundException('開帳存不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可過帳');
      if (!doc.items.length) throw new BadRequestException('無明細不可過帳');

      const movementDate = movementDateFromInitDate(doc.initDate);

      for (const line of doc.items) {
        const qty = line.qty;
        const unitCost = line.unitCost;
        if (qty.lte(0) || unitCost.lte(0)) {
          throw new BadRequestException('明細數量與均價須大於 0');
        }

        const bal = await tx.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.warehouseId,
            },
          },
        });

        const oldOn = bal?.onHandQty ?? d(0);
        const oldAvg = bal?.avgCost ?? d(0);
        const reserved = bal?.reservedQty ?? d(0);
        const newOn = oldOn.add(qty);
        const newAvg = oldOn.eq(0)
          ? unitCost
          : oldOn.mul(oldAvg).add(qty.mul(unitCost)).div(newOn);
        const stockValue = roundMoney2(newOn.mul(newAvg));
        const available = newOn.sub(reserved);
        const locId = await resolveLedgerLocationId(
          tx,
          tenantId,
          doc.warehouseId,
          line.locationId,
        );

        await tx.nx02StockLedger.create({
          data: {
            tenantId,
            movementDate,
            partId: line.partId,
            warehouseId: doc.warehouseId,
            locationId: locId,
            movementType: 'I',
            qtyIn: qty,
            qtyOut: d(0),
            unitCost,
            totalCost: line.totalCost,
            balanceQty: newOn,
            balanceCost: newAvg,
            sourceModule: 'NX02',
            sourceDocType: 'I',
            sourceDocId: doc.id,
            sourceItemId: line.id,
          },
        });

        await tx.nx02StockBalance.upsert({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.warehouseId,
            },
          },
          create: {
            tenantId,
            partId: line.partId,
            warehouseId: doc.warehouseId,
            onHandQty: newOn,
            reservedQty: reserved,
            availableQty: available,
            inTransitQty: d(0),
            avgCost: newAvg,
            stockValue,
            lastInAt: now,
            lastMoveAt: now,
            isActive: true,
            createdBy: userId ?? null,
            updatedBy: userId ?? null,
          },
          update: {
            onHandQty: newOn,
            avgCost: newAvg,
            availableQty: available,
            stockValue,
            lastInAt: now,
            lastMoveAt: now,
            updatedBy: userId ?? null,
          },
        });
      }

      await tx.nx02Init.update({
        where: { id },
        data: {
          status: 'P',
          postedAt: now,
          postedBy: userId ?? null,
          updatedBy: userId ?? null,
        },
      });
    });

    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-INIT-SVC-001-F06
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.prisma.nx02Init.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('開帳存不存在');
    if (existing.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx02Init.update({
      where: { id },
      data: {
        status: 'V',
        voidedAt: now,
        voidedBy: userId ?? null,
        updatedBy: userId ?? null,
      },
    });
    return this.getById(tenantId, id);
  }
}
