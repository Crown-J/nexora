/**
 * File: apps/nx-api/src/nx01/rr/rr.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RR-SVC-001：進貨單 CRUD、過帳（台帳 I／P、加權均價、缺貨偵測）
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

import { allocateRrDocNo } from '../utils/nx01-doc-no';
import {
  calcHeaderTax,
  d,
  lineAmountFromQtyCost,
  movementDateFromDocDate,
  parseYmd,
  resolveTwdCurrencyId,
  roundMoney2,
} from '../utils/nx01-helpers';

import type { CreateRrBodyDto, PatchRrBodyDto, RrItemInputDto } from './dto/rr.dto';

const rrDetailInclude = {
  warehouse: { select: { id: true, code: true, name: true } as const },
  supplier: { select: { id: true, code: true, name: true } as const },
  rfq: { select: { id: true, docNo: true } },
  po: { select: { id: true, docNo: true } },
  currencyRef: { select: { id: true, code: true } },
  items: {
    orderBy: { lineNo: 'asc' as const },
    include: { location: { select: { code: true, name: true } } },
  },
} as const;

type RrDetailRow = Prisma.Nx01RrGetPayload<{ include: typeof rrDetailInclude }>;

@Injectable()
export class RrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortage: ShortageService,
  ) { }

  private mapDetail(row: RrDetailRow) {
    return {
      id: row.id,
      docNo: row.docNo,
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      rrDate: row.rrDate.toISOString().slice(0, 10),
      supplierId: row.supplierId,
      supplierCode: row.supplier.code,
      supplierName: row.supplier.name,
      rfqId: row.rfqId,
      rfqDocNo: row.rfq?.docNo ?? null,
      poId: row.poId,
      poDocNo: row.po?.docNo ?? null,
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
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        locationId: it.locationId,
        locationCode: it.location?.code ?? null,
        qty: it.qty.toNumber(),
        unitCost: it.unitCost.toNumber(),
        lineAmount: it.lineAmount.toNumber(),
        poItemId: it.poItemId,
        rfqItemId: it.rfqItemId,
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX01-RR-SVC-001-F01
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
    const where: Prisma.Nx01RrWhereInput = { tenantId };
    if (opts.supplierId) where.supplierId = opts.supplierId;
    if (opts.status && ['D', 'P', 'C'].includes(opts.status)) where.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      where.rrDate = {};
      if (opts.dateFrom) where.rrDate.gte = parseYmd(opts.dateFrom);
      if (opts.dateTo) where.rrDate.lte = parseYmd(opts.dateTo);
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
      this.prisma.nx01Rr.count({ where }),
      this.prisma.nx01Rr.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: opts.pageSize,
        include: {
          warehouse: { select: { code: true, name: true } },
          supplier: { select: { code: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        docNo: r.docNo,
        rrDate: r.rrDate.toISOString().slice(0, 10),
        warehouseCode: r.warehouse.code,
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
   * @FUNCTION_CODE NX01-RR-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx01Rr.findFirst({
      where: { id, tenantId },
      include: rrDetailInclude,
    });
    if (!row) throw new NotFoundException('進貨單不存在');
    return this.mapDetail(row);
  }

  private async assertWh(tenantId: string, warehouseId: string) {
    const w = await this.prisma.nx00Warehouse.findFirst({
      where: { id: warehouseId, tenantId, isActive: true },
      select: { id: true, code: true },
    });
    if (!w) throw new BadRequestException('倉庫不存在或已停用');
    return w;
  }

  private async assertSupplier(tenantId: string, supplierId: string) {
    const p = await this.prisma.nx00Partner.findFirst({
      where: { id: supplierId, tenantId, isActive: true, partnerType: 'S' },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('供應商不存在、已停用或類型非零件供應商');
    return p;
  }

  private async assertPart(tenantId: string, partId: string) {
    const p = await this.prisma.nx00Part.findFirst({
      where: { id: partId, tenantId, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!p) throw new BadRequestException(`零件不存在：${partId}`);
    return p;
  }

  private async maybeClosePoAfterRrPost(
    tx: Prisma.TransactionClient,
    poId: string,
    userId: string | undefined,
  ) {
    const items = await tx.nx01PoItem.findMany({ where: { poId } });
    const allReceived = items.length > 0 && items.every((it) => it.receivedQty.gte(it.qty));
    if (allReceived) {
      await tx.nx01Po.update({
        where: { id: poId },
        data: { status: 'C', updatedBy: userId ?? null },
      });
    }
  }

  private async buildItems(
    tenantId: string,
    warehouseId: string,
    inputs: RrItemInputDto[],
  ) {
    if (!inputs?.length) throw new BadRequestException('至少一筆明細');
    const out: {
      partId: string;
      partNo: string;
      partName: string;
      locationId: string;
      qty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineAmount: Prisma.Decimal;
      poItemId: string | null;
      rfqItemId: string | null;
      remark: string | null;
    }[] = [];
    for (const raw of inputs) {
      const part = await this.assertPart(tenantId, raw.partId);
      const loc = await this.prisma.nx00Location.findFirst({
        where: {
          id: raw.locationId,
          tenantId,
          warehouseId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException(`庫位不存在或不在本倉：${raw.locationId}`);
      const qty = d(raw.qty);
      const unitCost = d(raw.unitCost);
      if (qty.lte(0) || unitCost.lt(0)) throw new BadRequestException('數量與單價須有效');
      const lineAmount = lineAmountFromQtyCost(qty, unitCost);
      out.push({
        partId: part.id,
        partNo: part.code,
        partName: part.name,
        locationId: loc.id,
        qty,
        unitCost,
        lineAmount,
        poItemId: raw.poItemId?.trim() || null,
        rfqItemId: raw.rfqItemId?.trim() || null,
        remark: raw.remark?.trim() ? raw.remark.trim() : null,
      });
    }
    return out;
  }

  /**
   * @FUNCTION_CODE NX01-RR-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateRrBodyDto) {
    const wh = await this.assertWh(tenantId, body.warehouseId);
    await this.assertSupplier(tenantId, body.supplierId);
    if (body.rfqId?.trim()) {
      const rfq = await this.prisma.nx01Rfq.findFirst({ where: { id: body.rfqId.trim(), tenantId } });
      if (!rfq) throw new NotFoundException('詢價單不存在');
      if (rfq.status !== 'R') throw new BadRequestException('僅「已回覆」之詢價單可轉進貨');
      if (rfq.supplierId && rfq.supplierId !== body.supplierId) {
        throw new BadRequestException('供應商須與詢價單一致');
      }
    }
    if (body.poId?.trim()) {
      const po = await this.prisma.nx01Po.findFirst({ where: { id: body.poId.trim(), tenantId } });
      if (!po) throw new NotFoundException('採購單不存在');
      if (po.status !== 'S') throw new BadRequestException('僅已送出的採購單可轉進貨');
      if (po.supplierId !== body.supplierId) {
        throw new BadRequestException('供應商須與採購單一致');
      }
    }
    const rrDate = body.rrDate ? parseYmd(body.rrDate) : parseYmd(new Date().toISOString().slice(0, 10));
    const currencyId = body.currencyId?.trim() || (await resolveTwdCurrencyId(this.prisma));
    const taxRate = body.taxRate != null ? d(body.taxRate) : d(5);
    const items = await this.buildItems(tenantId, body.warehouseId, body.items);
    for (const it of items) {
      if (it.rfqItemId && body.rfqId?.trim()) {
        const fi = await this.prisma.nx01RfqItem.findFirst({
          where: { id: it.rfqItemId, rfqId: body.rfqId.trim() },
        });
        if (!fi) throw new BadRequestException('詢價明細與來源詢價單不符');
      }
      if (it.poItemId && body.poId?.trim()) {
        const pi = await this.prisma.nx01PoItem.findFirst({
          where: { id: it.poItemId, poId: body.poId.trim() },
        });
        if (!pi) throw new BadRequestException('採購明細與來源採購單不符');
      }
    }
    let subtotal = d(0);
    for (const it of items) subtotal = subtotal.add(it.lineAmount);
    subtotal = roundMoney2(subtotal);
    const { taxAmount, totalAmount } = calcHeaderTax(subtotal, taxRate, body.taxAmount != null ? d(body.taxAmount) : null);

    const createdId = await this.prisma.$transaction(async (tx) => {
      const no = await allocateRrDocNo(tx, tenantId, rrDate, wh.code);
      const doc = await tx.nx01Rr.create({
        data: {
          tenantId,
          warehouseId: body.warehouseId,
          docNo: no,
          rrDate,
          supplierId: body.supplierId,
          rfqId: body.rfqId?.trim() || null,
          poId: body.poId?.trim() || null,
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
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              locationId: it.locationId,
              qty: it.qty,
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              poItemId: it.poItemId,
              rfqItemId: it.rfqItemId,
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
   * @FUNCTION_CODE NX01-RR-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchRrBodyDto) {
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Rr.findFirst({ where: { id, tenantId } });
      if (!doc) throw new NotFoundException('進貨單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可修改');

      const rrDate = body.rrDate ? parseYmd(body.rrDate) : undefined;
      if (body.supplierId) await this.assertSupplier(tenantId, body.supplierId);

      let currencyId = doc.currencyId;
      if (body.currencyId?.trim()) currencyId = body.currencyId.trim();

      let taxRate = doc.taxRate;
      if (body.taxRate != null) taxRate = d(body.taxRate);

      let itemsPayload: Awaited<ReturnType<RrService['buildItems']>> | null = null;
      if (body.items) {
        itemsPayload = await this.buildItems(tenantId, doc.warehouseId, body.items);
        await tx.nx01RrItem.deleteMany({ where: { rrId: id } });
        let line = 1;
        for (const it of itemsPayload) {
          await tx.nx01RrItem.create({
            data: {
              rrId: id,
              lineNo: line++,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              locationId: it.locationId,
              qty: it.qty,
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              poItemId: it.poItemId,
              rfqItemId: it.rfqItemId,
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
            await tx.nx01RrItem.findMany({
              where: { rrId: id },
              orderBy: { lineNo: 'asc' },
            })
          ).map((it) => ({
            lineAmount: it.lineAmount,
          }));
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

      await tx.nx01Rr.update({
        where: { id },
        data: {
          ...(rrDate ? { rrDate } : {}),
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
   * @FUNCTION_CODE NX01-RR-SVC-001-F05
   */
  async post(tenantId: string, userId: string | undefined, id: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Rr.findFirst({
        where: { id, tenantId },
        include: { items: true, warehouse: true },
      });
      if (!doc) throw new NotFoundException('進貨單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可過帳');
      if (!doc.items.length) throw new BadRequestException('無明細不可過帳');

      const movementDate = movementDateFromDocDate(doc.rrDate);

      for (const line of doc.items) {
        const qty = line.qty;
        const unitCost = line.unitCost;
        if (qty.lte(0) || unitCost.lt(0)) {
          throw new BadRequestException(`明細 ${line.partNo} 數量與成本須有效`);
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

        const locId = await resolveLedgerLocationId(tx, tenantId, doc.warehouseId, line.locationId);

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
            totalCost: line.lineAmount,
            balanceQty: newOn,
            balanceCost: newAvg,
            sourceModule: 'NX01',
            sourceDocType: 'P',
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

        await this.shortage.detect(tx, tenantId, line.partId, doc.warehouseId, userId ?? null);

        if (line.poItemId) {
          const pit = await tx.nx01PoItem.findUnique({
            where: { id: line.poItemId },
            select: { id: true, receivedQty: true, qty: true, partNo: true },
          });
          if (pit) {
            const nextRecv = pit.receivedQty.add(qty);
            if (nextRecv.gt(pit.qty)) {
              throw new BadRequestException(`收貨累計超過採購量（${pit.partNo}）`);
            }
            await tx.nx01PoItem.update({
              where: { id: pit.id },
              data: { receivedQty: nextRecv, updatedBy: userId ?? null },
            });
          }
        }
      }

      if (doc.rfqId) {
        const seen = new Set<string>();
        for (const line of doc.items) {
          if (!line.rfqItemId || seen.has(line.rfqItemId)) continue;
          seen.add(line.rfqItemId);
          const fi = await tx.nx01RfqItem.findFirst({
            where: { id: line.rfqItemId, rfqId: doc.rfqId },
            select: { id: true },
          });
          if (fi) {
            await tx.nx01RfqItem.update({
              where: { id: fi.id },
              data: { status: 'S', updatedBy: userId ?? null },
            });
          }
        }
      }

      if (doc.poId) {
        await this.maybeClosePoAfterRrPost(tx, doc.poId, userId);
      }

      await tx.nx01Rr.update({
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
   * @FUNCTION_CODE NX01-RR-SVC-001-F06
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx01Rr.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('進貨單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx01Rr.update({
      where: { id },
      data: {
        status: 'C',
        voidedAt: now,
        voidedBy: userId ?? null,
        updatedBy: userId ?? null,
      },
    });
    return this.getById(tenantId, id);
  }
}
