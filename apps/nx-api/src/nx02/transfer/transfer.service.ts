/**
 * File: apps/nx-api/src/nx02/transfer/transfer.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-SVC-001：調撥單 CRUD、過帳（雙邊 ledger + 均價）、作廢
 *
 * Notes:
 * - 過帳於 Prisma transaction；過帳後呼叫 ShortageService.detect
 * - @FUNCTION_CODE NX02-XFER-SVC-001-F01
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { ShortageService } from '../shortage/shortage.service';
import { allocateTransferDocNo } from '../utils/nx02-doc-no';
import { resolveLedgerLocationId } from '../utils/nx02-resolve-location';

import type {
  CreateTransferBodyDto,
  PatchTransferBodyDto,
  TransferItemInputDto,
} from './dto/transfer.dto';

function d(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

function parseYmd(s: string): Date {
  const t = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) throw new BadRequestException('stDate must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
}

function movementDateFromStDate(stDate: Date): Date {
  return new Date(
    Date.UTC(
      stDate.getUTCFullYear(),
      stDate.getUTCMonth(),
      stDate.getUTCDate(),
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

const transferDetailInclude = {
  fromWarehouse: { select: { id: true, code: true, name: true } as const },
  toWarehouse: { select: { id: true, code: true, name: true } as const },
  items: {
    orderBy: { lineNo: 'asc' as const },
    include: {
      fromLocation: { select: { code: true, name: true } },
      toLocation: { select: { code: true, name: true } },
    },
  },
} as const;

type TransferDetailRow = Prisma.Nx02StockTransferGetPayload<{
  include: typeof transferDetailInclude;
}>;

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortage: ShortageService,
  ) { }

  private async mapDetail(tenantId: string, row: TransferDetailRow) {
    const items = await Promise.all(
      row.items.map(async (it) => {
        const bal = await this.prisma.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: it.partId,
              warehouseId: row.fromWarehouseId,
            },
          },
        });
        return {
          id: it.id,
          lineNo: it.lineNo,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          fromLocationId: it.fromLocationId,
          fromLocationCode: it.fromLocation?.code ?? null,
          fromLocationName: it.fromLocation?.name ?? null,
          toLocationId: it.toLocationId,
          toLocationCode: it.toLocation?.code ?? null,
          toLocationName: it.toLocation?.name ?? null,
          qty: it.qty.toNumber(),
          unitCost: it.unitCost.toNumber(),
          remark: it.remark,
          fromWarehouseOnHand: bal?.onHandQty.toNumber() ?? 0,
        };
      }),
    );

    return {
      id: row.id,
      docNo: row.docNo,
      stDate: row.stDate.toISOString().slice(0, 10),
      fromWarehouseId: row.fromWarehouseId,
      fromWarehouseName: row.fromWarehouse.name,
      toWarehouseId: row.toWarehouseId,
      toWarehouseName: row.toWarehouse.name,
      status: row.status,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      items,
    };
  }

  /**
   * @FUNCTION_CODE NX02-XFER-SVC-001-F01
   */
  async list(
    tenantId: string,
    opts: { page: number; pageSize: number; status?: string; warehouseId?: string },
  ) {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const where: Prisma.Nx02StockTransferWhereInput = { tenantId };
    if (opts.status && ['D', 'P', 'V'].includes(opts.status)) {
      where.status = opts.status;
    }
    if (opts.warehouseId?.trim()) {
      const wid = opts.warehouseId.trim();
      where.OR = [{ fromWarehouseId: wid }, { toWarehouseId: wid }];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx02StockTransfer.count({ where }),
      this.prisma.nx02StockTransfer.findMany({
        where,
        orderBy: [{ stDate: 'desc' }, { docNo: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => ({
        id: r.id,
        docNo: r.docNo,
        stDate: r.stDate.toISOString().slice(0, 10),
        fromWarehouseId: r.fromWarehouseId,
        fromWarehouseName: r.fromWarehouse.name,
        toWarehouseId: r.toWarehouseId,
        toWarehouseName: r.toWarehouse.name,
        itemCount: r._count.items,
        status: r.status,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX02-XFER-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx02StockTransfer.findFirst({
      where: { id, tenantId },
      include: transferDetailInclude,
    });
    if (!row) throw new NotFoundException('調撥單不存在');
    return this.mapDetail(tenantId, row);
  }

  private async assertItemLocations(
    tx: Prisma.TransactionClient,
    tenantId: string,
    fromWh: string,
    toWh: string,
    items: TransferItemInputDto[],
  ) {
    for (const it of items) {
      if (it.qty <= 0) throw new BadRequestException('調撥數量須大於 0');
      if (it.fromLocationId?.trim()) {
        const loc = await tx.nx00Location.findFirst({
          where: {
            id: it.fromLocationId.trim(),
            tenantId,
            warehouseId: fromWh,
            isActive: true,
          },
        });
        if (!loc) throw new BadRequestException('出貨庫位不屬於來源倉或未啟用');
      }
      if (it.toLocationId?.trim()) {
        const loc = await tx.nx00Location.findFirst({
          where: {
            id: it.toLocationId.trim(),
            tenantId,
            warehouseId: toWh,
            isActive: true,
          },
        });
        if (!loc) throw new BadRequestException('目標庫位不屬於目標倉或未啟用');
      }
    }
  }

  /**
   * @FUNCTION_CODE NX02-XFER-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateTransferBodyDto) {
    const fromId = body.fromWarehouseId?.trim();
    const toId = body.toWarehouseId?.trim();
    if (!fromId || !toId) throw new BadRequestException('來源倉與目標倉必填');
    if (fromId === toId) throw new BadRequestException('來源倉與目標倉不可相同');
    if (!body.items?.length) throw new BadRequestException('至少一筆明細');

    const stDate = parseYmd(body.stDate);

    const created = await this.prisma.$transaction(async (tx) => {
      const [fromWh, toWh] = await Promise.all([
        tx.nx00Warehouse.findFirst({ where: { id: fromId, tenantId, isActive: true } }),
        tx.nx00Warehouse.findFirst({ where: { id: toId, tenantId, isActive: true } }),
      ]);
      if (!fromWh || !toWh) throw new BadRequestException('倉庫不存在或未啟用');

      await this.assertItemLocations(tx, tenantId, fromId, toId, body.items);

      const docNo = await allocateTransferDocNo(tx, tenantId, stDate, fromWh.code);

      let lineNo = 0;
      const itemCreates: Array<{
        lineNo: number;
        partId: string;
        partNo: string;
        partName: string;
        partBrandId: string | null;
        fromLocationId: string | null;
        toLocationId: string | null;
        qty: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        remark: string;
        createdBy: string | null;
        updatedBy: string | null;
      }> = [];
      for (const it of body.items) {
        lineNo += 1;
        const part = await tx.nx00Part.findFirst({
          where: { id: it.partId.trim(), tenantId, isActive: true },
        });
        if (!part) throw new BadRequestException(`料號不存在：${it.partId}`);
        itemCreates.push({
          lineNo,
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          partBrandId: part.partBrandId ?? null,
          fromLocationId: it.fromLocationId?.trim() || null,
          toLocationId: it.toLocationId?.trim() || null,
          qty: d(it.qty),
          unitCost: d(0),
          remark: it.remark ?? '',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        });
      }

      return tx.nx02StockTransfer.create({
        data: {
          tenantId,
          docNo,
          stDate,
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          status: 'D',
          remark: body.remark ?? '',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: { create: itemCreates },
        },
        include: transferDetailInclude,
      });
    });

    return this.mapDetail(tenantId, created);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchTransferBodyDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx02StockTransfer.findFirst({ where: { id, tenantId } });
      if (!doc) throw new NotFoundException('調撥單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可修改');

      const stDate = body.stDate != null ? parseYmd(body.stDate) : doc.stDate;
      const fromId = doc.fromWarehouseId;
      const toId = doc.toWarehouseId;

      if (body.items) {
        if (!body.items.length) throw new BadRequestException('至少一筆明細');
        await this.assertItemLocations(tx, tenantId, fromId, toId, body.items);
        await tx.nx02StockTransferItem.deleteMany({ where: { stId: id } });
        let lineNo = 0;
        for (const it of body.items) {
          lineNo += 1;
          const part = await tx.nx00Part.findFirst({
            where: { id: it.partId.trim(), tenantId, isActive: true },
          });
          if (!part) throw new BadRequestException(`料號不存在：${it.partId}`);
          await tx.nx02StockTransferItem.create({
            data: {
              stId: id,
              lineNo,
              partId: part.id,
              partNo: part.code,
              partName: part.name,
              partBrandId: part.partBrandId ?? null,
              fromLocationId: it.fromLocationId?.trim() || null,
              toLocationId: it.toLocationId?.trim() || null,
              qty: d(it.qty),
              unitCost: d(0),
              remark: it.remark ?? '',
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
      }

      return tx.nx02StockTransfer.update({
        where: { id },
        data: {
          stDate,
          remark: body.remark !== undefined ? body.remark ?? '' : undefined,
          updatedBy: userId ?? null,
        },
        include: transferDetailInclude,
      });
    });

    return this.mapDetail(tenantId, updated);
  }

  /**
   * @FUNCTION_CODE NX02-XFER-SVC-001-F05
   */
  async post(tenantId: string, userId: string | undefined, id: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx02StockTransfer.findFirst({
        where: { id, tenantId },
        include: { items: { orderBy: { lineNo: 'asc' } }, fromWarehouse: true, toWarehouse: true },
      });
      if (!doc) throw new NotFoundException('調撥單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可過帳');
      if (!doc.items.length) throw new BadRequestException('無明細不可過帳');

      const movementDate = movementDateFromStDate(doc.stDate);

      for (const line of doc.items) {
        const qty = line.qty;
        if (qty.lte(0)) throw new BadRequestException(`料號 ${line.partNo} 數量須大於 0`);

        const srcBal = await tx.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.fromWarehouseId,
            },
          },
        });
        const avail = srcBal?.availableQty ?? d(0);
        if (avail.lt(qty)) {
          throw new BadRequestException(
            `料號 ${line.partNo} 來源倉可出庫量不足（需要 ${qty.toString()}，可用 ${avail.toString()}）`,
          );
        }

        const srcOn = srcBal?.onHandQty ?? d(0);
        const srcAvg = srcBal?.avgCost ?? d(0);
        const srcReserved = srcBal?.reservedQty ?? d(0);
        const newSrcOn = srcOn.sub(qty);
        const srcStockValue = roundMoney2(newSrcOn.mul(srcAvg));
        const srcAvailable = newSrcOn.sub(srcReserved);

        const fromLocId = await resolveLedgerLocationId(
          tx,
          tenantId,
          doc.fromWarehouseId,
          line.fromLocationId,
        );
        const unitCostMove = srcAvg;
        const totalCostOut = roundMoney2(qty.mul(unitCostMove));

        await tx.nx02StockLedger.create({
          data: {
            tenantId,
            movementDate,
            partId: line.partId,
            warehouseId: doc.fromWarehouseId,
            locationId: fromLocId,
            movementType: 'O',
            qtyIn: d(0),
            qtyOut: qty,
            unitCost: unitCostMove,
            totalCost: totalCostOut,
            balanceQty: newSrcOn,
            balanceCost: srcAvg,
            sourceModule: 'NX02',
            sourceDocType: 'X',
            sourceDocId: doc.id,
            sourceItemId: line.id,
          },
        });

        await tx.nx02StockBalance.upsert({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.fromWarehouseId,
            },
          },
          create: {
            tenantId,
            partId: line.partId,
            warehouseId: doc.fromWarehouseId,
            onHandQty: newSrcOn,
            reservedQty: srcReserved,
            availableQty: srcAvailable,
            inTransitQty: d(0),
            avgCost: srcAvg,
            stockValue: srcStockValue,
            lastOutAt: now,
            lastMoveAt: now,
            isActive: true,
            createdBy: userId ?? null,
            updatedBy: userId ?? null,
          },
          update: {
            onHandQty: newSrcOn,
            availableQty: srcAvailable,
            stockValue: srcStockValue,
            lastOutAt: now,
            lastMoveAt: now,
            updatedBy: userId ?? null,
          },
        });

        const tgtBal = await tx.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.toWarehouseId,
            },
          },
        });
        const tgtOn = tgtBal?.onHandQty ?? d(0);
        const tgtAvg = tgtBal?.avgCost ?? d(0);
        const tgtReserved = tgtBal?.reservedQty ?? d(0);
        const newTgtOn = tgtOn.add(qty);
        const newTgtAvg = tgtOn.eq(0)
          ? unitCostMove
          : tgtOn.mul(tgtAvg).add(qty.mul(unitCostMove)).div(newTgtOn);
        const tgtStockValue = roundMoney2(newTgtOn.mul(newTgtAvg));
        const tgtAvailable = newTgtOn.sub(tgtReserved);

        const toLocId = await resolveLedgerLocationId(
          tx,
          tenantId,
          doc.toWarehouseId,
          line.toLocationId,
        );
        const totalCostIn = roundMoney2(qty.mul(unitCostMove));

        await tx.nx02StockLedger.create({
          data: {
            tenantId,
            movementDate,
            partId: line.partId,
            warehouseId: doc.toWarehouseId,
            locationId: toLocId,
            movementType: 'I',
            qtyIn: qty,
            qtyOut: d(0),
            unitCost: unitCostMove,
            totalCost: totalCostIn,
            balanceQty: newTgtOn,
            balanceCost: newTgtAvg,
            sourceModule: 'NX02',
            sourceDocType: 'X',
            sourceDocId: doc.id,
            sourceItemId: line.id,
          },
        });

        await tx.nx02StockBalance.upsert({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.toWarehouseId,
            },
          },
          create: {
            tenantId,
            partId: line.partId,
            warehouseId: doc.toWarehouseId,
            onHandQty: newTgtOn,
            reservedQty: tgtReserved,
            availableQty: tgtAvailable,
            inTransitQty: d(0),
            avgCost: newTgtAvg,
            stockValue: tgtStockValue,
            lastInAt: now,
            lastMoveAt: now,
            isActive: true,
            createdBy: userId ?? null,
            updatedBy: userId ?? null,
          },
          update: {
            onHandQty: newTgtOn,
            avgCost: newTgtAvg,
            availableQty: tgtAvailable,
            stockValue: tgtStockValue,
            lastInAt: now,
            lastMoveAt: now,
            updatedBy: userId ?? null,
          },
        });

        await tx.nx02StockTransferItem.update({
          where: { id: line.id },
          data: { unitCost: unitCostMove, updatedBy: userId ?? null },
        });

        await this.shortage.detect(tx, tenantId, line.partId, doc.fromWarehouseId, userId ?? null);
        await this.shortage.detect(tx, tenantId, line.partId, doc.toWarehouseId, userId ?? null);
      }

      await tx.nx02StockTransfer.update({
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
   * @FUNCTION_CODE NX02-XFER-SVC-001-F06
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx02StockTransfer.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('調撥單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx02StockTransfer.update({
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
