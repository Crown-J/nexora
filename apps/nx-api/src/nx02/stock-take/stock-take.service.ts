/**
 * File: apps/nx-api/src/nx02/stock-take/stock-take.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-SVC-001：盤點單建立、明細更新、過帳（ledger A）、作廢、CSV 匯出
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { allocateStockTakeDocNo } from '../utils/nx02-doc-no';
import { resolveLedgerLocationId } from '../utils/nx02-resolve-location';

import type { CreateStockTakeBodyDto, PatchStockTakeItemsBodyDto } from './dto/stock-take.dto';

function d(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

function parseYmd(s: string): Date {
  const t = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) throw new BadRequestException('stockTakeDate must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
}

function movementDateFrom(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function roundMoney2(x: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(x.toFixed(2, Prisma.Decimal.ROUND_HALF_UP));
}

@Injectable()
export class StockTakeService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F01
   */
  async list(
    tenantId: string,
    opts: { warehouseId?: string; status?: string; page: number; pageSize: number },
  ) {
    const where: Prisma.Nx02StockTakeWhereInput = { tenantId };
    if (opts.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts.status && ['D', 'C', 'P', 'V'].includes(opts.status)) where.status = opts.status;

    const skip = (opts.page - 1) * opts.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx02StockTake.count({ where }),
      this.prisma.nx02StockTake.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: opts.pageSize,
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          items: { select: { id: true, countedQty: true } },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const itemCount = r.items.length;
      const countedDone = r.items.filter((i) => i.countedQty != null).length;
      return {
        id: r.id,
        docNo: r.docNo,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouse.name,
        stockTakeDate: r.stockTakeDate.toISOString().slice(0, 10),
        scopeType: r.scopeType,
        itemCount,
        countedDoneCount: countedDone,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      };
    });
    return { data, total, page: opts.page, pageSize: opts.pageSize };
  }

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx02StockTake.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        items: { orderBy: { lineNo: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('盤點單不存在');
    return {
      id: row.id,
      docNo: row.docNo,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      stockTakeDate: row.stockTakeDate.toISOString().slice(0, 10),
      scopeType: row.scopeType,
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
        warehouseId: it.warehouseId,
        locationId: it.locationId,
        systemQty: it.systemQty.toNumber(),
        countedQty: it.countedQty?.toNumber() ?? null,
        diffQty: it.diffQty.toNumber(),
        unitCost: it.unitCost.toNumber(),
        diffCost: it.diffCost.toNumber(),
        adjustType: it.adjustType,
        status: it.status,
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateStockTakeBodyDto) {
    const whId = body.warehouseId.trim();
    const wh = await this.prisma.nx00Warehouse.findFirst({
      where: { id: whId, tenantId, isActive: true },
      select: { id: true, code: true },
    });
    if (!wh) throw new BadRequestException('倉庫不存在或已停用');

    const stDate = parseYmd(body.stockTakeDate);
    const scope = body.scopeType;
    if (scope !== 'F' && scope !== 'P') throw new BadRequestException('scopeType 須為 F 或 P');
    if (scope === 'P') {
      if (!body.partIds?.length) throw new BadRequestException('部分盤點須指定 partIds');
    }

    const defaultLocId = await resolveLedgerLocationId(this.prisma, tenantId, wh.id, null);

    type LineSeed = {
      partId: string;
      partNo: string;
      partName: string;
      systemQty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    };

    let seeds: LineSeed[] = [];

    if (scope === 'F') {
      const balances = await this.prisma.nx02StockBalance.findMany({
        where: { tenantId, warehouseId: wh.id, isActive: true },
        include: { part: { select: { id: true, code: true, name: true } } },
        orderBy: [{ part: { code: 'asc' } }],
      });
      seeds = balances.map((b) => ({
        partId: b.partId,
        partNo: b.part.code,
        partName: b.part.name,
        systemQty: b.onHandQty,
        unitCost: b.avgCost,
      }));
      if (!seeds.length) throw new BadRequestException('此倉庫無庫存余額可盤點');
    } else {
      const uniq = [...new Set(body.partIds!.map((x) => x.trim()).filter(Boolean))];
      for (const pid of uniq) {
        const part = await this.prisma.nx00Part.findFirst({
          where: { id: pid, tenantId, isActive: true },
          select: { id: true, code: true, name: true },
        });
        if (!part) throw new BadRequestException(`零件不存在：${pid}`);
        const bal = await this.prisma.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: part.id,
              warehouseId: wh.id,
            },
          },
        });
        seeds.push({
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          systemQty: bal?.onHandQty ?? d(0),
          unitCost: bal?.avgCost ?? d(0),
        });
      }
    }

    const newId = await this.prisma.$transaction(async (tx) => {
      const docNo = await allocateStockTakeDocNo(tx, tenantId, stDate, wh.code);
      const doc = await tx.nx02StockTake.create({
        data: {
          tenantId,
          docNo,
          stockTakeDate: stDate,
          warehouseId: wh.id,
          scopeType: scope,
          status: 'D',
          remark: body.remark?.trim() ? body.remark.trim() : null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: seeds.map((s, i) => ({
              lineNo: i + 1,
              partId: s.partId,
              partNo: s.partNo,
              partName: s.partName,
              warehouseId: wh.id,
              locationId: defaultLocId,
              systemQty: s.systemQty,
              countedQty: null,
              diffQty: d(0),
              unitCost: s.unitCost,
              diffCost: d(0),
              adjustType: 'N',
              status: 'O',
              remark: null,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            })),
          },
        },
      });
      return doc.id;
    });
    return this.getById(tenantId, newId);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F04
   */
  async patchItems(
    tenantId: string,
    userId: string | undefined,
    id: string,
    body: PatchStockTakeItemsBodyDto,
  ) {
    const doc = await this.prisma.nx02StockTake.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('盤點單不存在');
    if (doc.status !== 'D' && doc.status !== 'C') {
      throw new BadRequestException('僅草稿或盤點中可更新明細');
    }
    if (!body.items?.length) throw new BadRequestException('items 不可為空');

    await this.prisma.$transaction(async (tx) => {
      for (const it of body.items) {
        const line = await tx.nx02StockTakeItem.findFirst({
          where: { id: it.id, stockTakeId: id },
        });
        if (!line) continue;
        await tx.nx02StockTakeItem.update({
          where: { id: line.id },
          data: {
            ...(it.countedQty !== undefined
              ? { countedQty: it.countedQty == null ? null : d(it.countedQty) }
              : {}),
            ...(it.remark !== undefined
              ? { remark: it.remark?.trim() ? it.remark.trim() : null }
              : {}),
            updatedBy: userId ?? null,
          },
        });
      }
      await tx.nx02StockTake.update({
        where: { id },
        data: { status: 'C', updatedBy: userId ?? null },
      });
    });

    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F05
   */
  async post(tenantId: string, userId: string | undefined, id: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx02StockTake.findFirst({
        where: { id, tenantId },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) throw new NotFoundException('盤點單不存在');
      if (doc.status !== 'D' && doc.status !== 'C') {
        throw new BadRequestException('僅草稿或盤點中可過帳');
      }

      const movementDate = movementDateFrom(doc.stockTakeDate);

      for (const line of doc.items) {
        if (line.countedQty == null) {
          await tx.nx02StockTakeItem.update({
            where: { id: line.id },
            data: {
              status: 'S',
              adjustType: 'N',
              diffQty: d(0),
              diffCost: d(0),
              updatedBy: userId ?? null,
            },
          });
          continue;
        }

        const counted = line.countedQty;
        const diff = counted.sub(line.systemQty);

        if (diff.eq(0)) {
          await tx.nx02StockTakeItem.update({
            where: { id: line.id },
            data: {
              diffQty: d(0),
              diffCost: d(0),
              adjustType: 'N',
              status: 'P',
              updatedBy: userId ?? null,
            },
          });
          continue;
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

        const curOn = bal?.onHandQty ?? d(0);
        const oldAvg = bal?.avgCost ?? d(0);
        const reserved = bal?.reservedQty ?? d(0);
        const uc = line.unitCost;

        const newOn = curOn.add(diff);
        if (newOn.lt(0)) {
          throw new BadRequestException(`料號 ${line.partNo} 過帳後庫存不可為負`);
        }

        let newAvg: Prisma.Decimal;
        let qtyIn = d(0);
        let qtyOut = d(0);
        let adj: 'I' | 'O';

        if (diff.gt(0)) {
          adj = 'I';
          qtyIn = diff;
          qtyOut = d(0);
          newAvg = curOn.eq(0)
            ? uc
            : curOn.mul(oldAvg).add(diff.mul(uc)).div(newOn);
        } else {
          adj = 'O';
          qtyIn = d(0);
          qtyOut = diff.abs();
          newAvg = oldAvg;
        }

        const stockValue = roundMoney2(newOn.mul(newAvg));
        const available = newOn.sub(reserved);
        const diffCost = roundMoney2(diff.abs().mul(uc));

        await tx.nx02StockLedger.create({
          data: {
            tenantId,
            movementDate,
            partId: line.partId,
            warehouseId: doc.warehouseId,
            locationId: line.locationId,
            movementType: 'A',
            qtyIn,
            qtyOut,
            unitCost: uc,
            totalCost: diffCost,
            balanceQty: newOn,
            balanceCost: newAvg,
            sourceModule: 'NX02',
            sourceDocType: 'T',
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
            lastInAt: diff.gt(0) ? now : null,
            lastOutAt: diff.lt(0) ? now : null,
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
            ...(diff.gt(0) ? { lastInAt: now } : {}),
            ...(diff.lt(0) ? { lastOutAt: now } : {}),
            lastMoveAt: now,
            updatedBy: userId ?? null,
          },
        });

        await tx.nx02StockTakeItem.update({
          where: { id: line.id },
          data: {
            diffQty: diff,
            diffCost,
            adjustType: adj,
            status: 'P',
            updatedBy: userId ?? null,
          },
        });
      }

      await tx.nx02StockTake.update({
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
   * @FUNCTION_CODE NX02-STTK-SVC-001-F06
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx02StockTake.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('盤點單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx02StockTake.update({
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

  /**
   * @FUNCTION_CODE NX02-STTK-SVC-001-F07
   */
  async exportCsv(tenantId: string, id: string): Promise<{ docNo: string; csv: string }> {
    const doc = await this.getById(tenantId, id);
    const headers = [
      '行號',
      '料號',
      '品名',
      '帳面數量',
      '實盤數量',
      '差異',
      '均價',
      '差異金額',
      '明細狀態',
      '備註',
    ];
    const lines = [headers.join(',')];
    for (const it of doc.items) {
      const row = [
        it.lineNo,
        csvEscape(it.partNo),
        csvEscape(it.partName),
        it.systemQty,
        it.countedQty ?? '',
        it.diffQty,
        it.unitCost,
        it.diffCost,
        it.status,
        csvEscape(it.remark ?? ''),
      ];
      lines.push(row.join(','));
    }
    return { docNo: doc.docNo, csv: lines.join('\r\n') };
  }
}

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}
