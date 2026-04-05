/**
 * File: apps/nx-api/src/nx01/pr/pr.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PR-SVC-001：退貨單 CRUD、過帳（台帳 O／R、均價不變、缺貨偵測）
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';
import { ShortageService } from '../../nx02/shortage/shortage.service';
import { resolveLedgerLocationId } from '../../nx02/utils/nx02-resolve-location';

import { allocatePrDocNo } from '../utils/nx01-doc-no';
import {
  calcHeaderTax,
  d,
  lineAmountFromQtyCost,
  movementDateFromDocDate,
  parseYmd,
  resolveTwdCurrencyId,
  roundMoney2,
} from '../utils/nx01-helpers';

import type { CreatePrBodyDto, CreatePrItemInputDto, PatchPrBodyDto } from './dto/pr.dto';

const prDetailInclude = {
  warehouse: { select: { id: true, code: true, name: true } as const },
  supplier: { select: { id: true, code: true, name: true } as const },
  rr: { select: { id: true, docNo: true } },
  currencyRef: { select: { id: true, code: true } },
  items: {
    orderBy: { lineNo: 'asc' as const },
    include: {
      location: { select: { code: true, name: true } },
      rrItem: { select: { id: true, qty: true } },
    },
  },
} as const;

type PrDetailRow = Prisma.Nx01PrGetPayload<{ include: typeof prDetailInclude }>;

@Injectable()
export class PrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortage: ShortageService,
  ) { }

  private mapDetail(row: PrDetailRow) {
    return {
      id: row.id,
      docNo: row.docNo,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      prDate: row.prDate.toISOString().slice(0, 10),
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      rrId: row.rrId,
      rrDocNo: row.rr?.docNo ?? null,
      currencyId: row.currencyId,
      currencyCode: row.currencyRef.code,
      status: row.status,
      subtotal: row.subtotal.toNumber(),
      taxRate: row.taxRate.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      items: row.items.map((it) => ({
        id: it.id,
        lineNo: it.lineNo,
        rrItemId: it.rrItemId,
        rrItemQty: it.rrItem.qty.toNumber(),
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        locationId: it.locationId,
        locationCode: it.location?.code ?? null,
        qty: it.qty.toNumber(),
        unitCost: it.unitCost.toNumber(),
        lineAmount: it.lineAmount.toNumber(),
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX01-PR-SVC-001-F01
   */
  async list(
    tenantId: string,
    opts: {
      q?: string;
      supplierId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const where: Prisma.Nx01PrWhereInput = { tenantId };
    if (opts.supplierId) where.supplierId = opts.supplierId;
    if (opts.status && ['D', 'P', 'V'].includes(opts.status)) where.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      where.prDate = {};
      if (opts.dateFrom) where.prDate.gte = parseYmd(opts.dateFrom);
      if (opts.dateTo) where.prDate.lte = parseYmd(opts.dateTo);
    }
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { docNo: { contains: q, mode: 'insensitive' } },
        { remark: { contains: q, mode: 'insensitive' } },
      ];
    }
    const skip = (opts.page - 1) * opts.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx01Pr.count({ where }),
      this.prisma.nx01Pr.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: opts.pageSize,
        include: {
          supplier: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        docNo: r.docNo,
        prDate: r.prDate.toISOString().slice(0, 10),
        supplierName: r.supplier.name,
        itemCount: r._count.items,
        status: r.status,
        totalAmount: r.totalAmount.toNumber(),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  /**
   * @FUNCTION_CODE NX01-PR-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx01Pr.findFirst({
      where: { id, tenantId },
      include: prDetailInclude,
    });
    if (!row) throw new NotFoundException('退貨單不存在');
    return this.mapDetail(row);
  }

  private async assertSupplier(tenantId: string, supplierId: string) {
    const p = await this.prisma.nx00Partner.findFirst({
      where: { id: supplierId, tenantId, isActive: true, partnerType: 'S' },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('供應商不存在、已停用或類型非零件供應商');
    return p;
  }

  private async assertWh(tenantId: string, warehouseId: string) {
    const w = await this.prisma.nx00Warehouse.findFirst({
      where: { id: warehouseId, tenantId, isActive: true },
      select: { id: true, code: true },
    });
    if (!w) throw new BadRequestException('倉庫不存在或已停用');
    return w;
  }

  private async sumReturnedQtyForRrItem(
    db: Pick<Prisma.TransactionClient, 'nx01PrItem'>,
    rrItemId: string,
    excludePrId?: string,
  ): Promise<Prisma.Decimal> {
    const rows = await db.nx01PrItem.findMany({
      where: {
        rrItemId,
        pr: excludePrId
          ? { status: 'P', id: { not: excludePrId } }
          : { status: 'P' },
      },
      select: { qty: true },
    });
    let s = d(0);
    for (const r of rows) s = s.add(r.qty);
    return s;
  }

  private async buildItemsFromRr(
    tenantId: string,
    warehouseId: string,
    rrId: string,
    supplierId: string,
    inputs: CreatePrItemInputDto[],
    tx?: Prisma.TransactionClient,
    excludePrId?: string,
  ) {
    const db = tx ?? this.prisma;
    const rr = await db.nx01Rr.findFirst({
      where: { id: rrId, tenantId, status: 'P' },
      include: { items: true },
    });
    if (!rr) throw new BadRequestException('來源進貨單不存在或未過帳');
    if (rr.supplierId !== supplierId) throw new BadRequestException('供應商與來源進貨單不一致');
    if (rr.warehouseId !== warehouseId) throw new BadRequestException('倉庫與來源進貨單不一致');

    const out: {
      rrItemId: string;
      partId: string;
      partNo: string;
      partName: string;
      locationId: string | null;
      qty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineAmount: Prisma.Decimal;
      remark: string | null;
    }[] = [];

    for (const raw of inputs) {
      const rrLine = rr.items.find((x) => x.id === raw.rrItemId);
      if (!rrLine) throw new BadRequestException(`進貨明細不屬於該進貨單：${raw.rrItemId}`);
      const qty = d(raw.qty);
      if (qty.lte(0)) throw new BadRequestException('退貨數量須大於 0');
      const already = await this.sumReturnedQtyForRrItem(db, raw.rrItemId, excludePrId);
      if (already.add(qty).gt(rrLine.qty)) {
        throw new BadRequestException(`退貨數量超過可退上限（料號 ${rrLine.partNo}）`);
      }
      const unitCost = rrLine.unitCost;
      const lineAmount = lineAmountFromQtyCost(qty, unitCost);
      let locationId: string | null = raw.locationId?.trim() || null;
      if (locationId) {
        const loc = await db.nx00Location.findFirst({
          where: { id: locationId, tenantId, warehouseId, isActive: true },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('退貨庫位不存在或不在本倉');
      }
      out.push({
        rrItemId: rrLine.id,
        partId: rrLine.partId,
        partNo: rrLine.partNo,
        partName: rrLine.partName,
        locationId,
        qty,
        unitCost,
        lineAmount,
        remark: raw.remark?.trim() ? raw.remark.trim() : null,
      });
    }
    return out;
  }

  /**
   * @FUNCTION_CODE NX01-PR-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreatePrBodyDto) {
    const wh = await this.assertWh(tenantId, body.warehouseId);
    await this.assertSupplier(tenantId, body.supplierId);
    const prDate = body.prDate ? parseYmd(body.prDate) : parseYmd(new Date().toISOString().slice(0, 10));
    const currencyId = body.currencyId?.trim() || (await resolveTwdCurrencyId(this.prisma));
    const taxRate = body.taxRate != null ? d(body.taxRate) : d(5);
    const items = await this.buildItemsFromRr(
      tenantId,
      body.warehouseId,
      body.rrId,
      body.supplierId,
      body.items,
    );
    let subtotal = d(0);
    for (const it of items) subtotal = subtotal.add(it.lineAmount);
    subtotal = roundMoney2(subtotal);
    const { taxAmount, totalAmount } = calcHeaderTax(subtotal, taxRate, body.taxAmount != null ? d(body.taxAmount) : null);

    const createdId = await this.prisma.$transaction(async (tx) => {
      const no = await allocatePrDocNo(tx, tenantId, prDate, wh.code);
      const doc = await tx.nx01Pr.create({
        data: {
          tenantId,
          warehouseId: body.warehouseId,
          docNo: no,
          prDate,
          supplierId: body.supplierId,
          rrId: body.rrId,
          currencyId,
          status: 'D',
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          remark: body.remark?.trim() ? body.remark.trim() : null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: items.map((it, i) => ({
              lineNo: i + 1,
              rrItemId: it.rrItemId,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              locationId: it.locationId,
              qty: it.qty,
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              remark: it.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            })),
          },
        },
        select: { id: true },
      });
      return doc.id;
    });

    return this.getById(tenantId, createdId);
  }

  /**
   * @FUNCTION_CODE NX01-PR-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchPrBodyDto) {
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Pr.findFirst({ where: { id, tenantId } });
      if (!doc) throw new NotFoundException('退貨單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可修改');

      const prDate = body.prDate ? parseYmd(body.prDate) : undefined;
      if (body.supplierId) await this.assertSupplier(tenantId, body.supplierId);

      let currencyId = doc.currencyId;
      if (body.currencyId?.trim()) currencyId = body.currencyId.trim();
      let taxRate = doc.taxRate;
      if (body.taxRate != null) taxRate = d(body.taxRate);

      let itemsPayload: Awaited<ReturnType<PrService['buildItemsFromRr']>> | null = null;
      if (body.items) {
        const sid = body.supplierId ?? doc.supplierId;
        const wid = doc.warehouseId;
        const rid = doc.rrId;
        if (!rid) throw new BadRequestException('缺少來源進貨單');
        itemsPayload = await this.buildItemsFromRr(tenantId, wid, rid, sid, body.items, tx, id);
        await tx.nx01PrItem.deleteMany({ where: { prId: id } });
        let line = 1;
        for (const it of itemsPayload) {
          await tx.nx01PrItem.create({
            data: {
              prId: id,
              lineNo: line++,
              rrItemId: it.rrItemId,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              locationId: it.locationId,
              qty: it.qty,
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              remark: it.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
      }

      const itemsForTax = itemsPayload
        ? itemsPayload
        : (
            await tx.nx01PrItem.findMany({
              where: { prId: id },
              orderBy: { lineNo: 'asc' },
            })
          ).map((it) => ({ lineAmount: it.lineAmount }));

      let subtotal = d(0);
      for (const it of itemsForTax) subtotal = subtotal.add(it.lineAmount);
      subtotal = roundMoney2(subtotal);
      const taxOverride =
        body.taxAmount !== undefined ? (body.taxAmount != null ? d(body.taxAmount) : null) : undefined;
      const { taxAmount, totalAmount } = calcHeaderTax(
        subtotal,
        taxRate,
        taxOverride === undefined ? doc.taxAmount : taxOverride,
      );

      await tx.nx01Pr.update({
        where: { id },
        data: {
          ...(prDate ? { prDate } : {}),
          ...(body.supplierId ? { supplierId: body.supplierId } : {}),
          currencyId,
          taxRate,
          subtotal,
          taxAmount,
          totalAmount,
          ...(body.remark !== undefined
            ? { remark: body.remark?.trim() ? body.remark.trim() : null }
            : {}),
          updatedBy: userId ?? null,
        },
      });
    });

    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-PR-SVC-001-F05
   */
  async post(tenantId: string, userId: string | undefined, id: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Pr.findFirst({
        where: { id, tenantId },
        include: { items: true, warehouse: true },
      });
      if (!doc) throw new NotFoundException('退貨單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可過帳');
      if (!doc.items.length) throw new BadRequestException('無明細不可過帳');

      const movementDate = movementDateFromDocDate(doc.prDate);

      for (const line of doc.items) {
        const qty = line.qty;
        const unitCost = line.unitCost;
        if (qty.lte(0)) throw new BadRequestException(`明細 ${line.partNo} 數量無效`);

        const bal = await tx.nx02StockBalance.findUnique({
          where: {
            tenantId_partId_warehouseId: {
              tenantId,
              partId: line.partId,
              warehouseId: doc.warehouseId,
            },
          },
        });
        const onHand = bal?.onHandQty ?? d(0);
        const avail = bal?.availableQty ?? d(0);
        if (avail.lt(qty)) {
          throw new BadRequestException(`料號 ${line.partNo} 可出庫量不足`);
        }

        const srcAvg = bal?.avgCost ?? d(0);
        const reserved = bal?.reservedQty ?? d(0);
        const newOn = onHand.sub(qty);
        const stockValue = roundMoney2(newOn.mul(srcAvg));
        const newAvail = newOn.sub(reserved);

        const locId = await resolveLedgerLocationId(
          tx,
          tenantId,
          doc.warehouseId,
          line.locationId,
        );
        const totalCostOut = roundMoney2(qty.mul(unitCost));

        await tx.nx02StockLedger.create({
          data: {
            tenantId,
            movementDate,
            partId: line.partId,
            warehouseId: doc.warehouseId,
            locationId: locId,
            movementType: 'O',
            qtyIn: d(0),
            qtyOut: qty,
            unitCost,
            totalCost: totalCostOut,
            balanceQty: newOn,
            balanceCost: srcAvg,
            sourceModule: 'NX01',
            sourceDocType: 'R',
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
            availableQty: newAvail,
            inTransitQty: d(0),
            avgCost: srcAvg,
            stockValue,
            lastOutAt: now,
            lastMoveAt: now,
            isActive: true,
            createdBy: userId ?? null,
            updatedBy: userId ?? null,
          },
          update: {
            onHandQty: newOn,
            availableQty: newAvail,
            stockValue,
            lastOutAt: now,
            lastMoveAt: now,
            updatedBy: userId ?? null,
          },
        });

        await this.shortage.detect(tx, tenantId, line.partId, doc.warehouseId, userId ?? null);
      }

      await tx.nx01Pr.update({
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
   * @FUNCTION_CODE NX01-PR-SVC-001-F06
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx01Pr.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('退貨單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx01Pr.update({
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
