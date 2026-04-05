/**
 * File: apps/nx-api/src/nx01/po/po.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PO-SVC-001：採購單 CRUD、狀態、轉進貨（部分收貨／received_qty／自動關閉）
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { RrService } from '../rr/rr.service';

import { allocatePoDocNo } from '../utils/nx01-doc-no';
import {
  calcHeaderTax,
  d,
  lineAmountFromQtyCost,
  parseYmd,
  resolveTwdCurrencyId,
  roundMoney2,
} from '../utils/nx01-helpers';

import type { CreatePoBodyDto, PatchPoBodyDto, PatchPoStatusBodyDto, PoItemInputDto, PoToRrBodyDto } from './dto/po.dto';

const poDetailInclude = {
  supplier: { select: { id: true, code: true, name: true } as const },
  rfq: { select: { id: true, docNo: true } },
  currencyRef: { select: { id: true, code: true } },
  items: {
    orderBy: { lineNo: 'asc' as const },
    include: { rfqItem: { select: { id: true } } },
  },
} as const;

type PoDetailRow = Prisma.Nx01PoGetPayload<{ include: typeof poDetailInclude }>;

@Injectable()
export class PoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rr: RrService,
  ) { }

  private mapDetail(row: PoDetailRow) {
    return {
      id: row.id,
      docNo: row.docNo,
      poDate: row.poDate.toISOString().slice(0, 10),
      supplierId: row.supplierId,
      supplierCode: row.supplier.code,
      supplierName: row.supplier.name,
      rfqId: row.rfqId,
      rfqDocNo: row.rfq?.docNo ?? null,
      currencyId: row.currencyId,
      currencyCode: row.currencyRef.code,
      status: row.status,
      subtotal: row.subtotal.toNumber(),
      taxRate: row.taxRate.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      expectedDate: row.expectedDate?.toISOString().slice(0, 10) ?? null,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      voidedAt: row.voidedAt?.toISOString() ?? null,
      items: row.items.map((it) => ({
        id: it.id,
        lineNo: it.lineNo,
        rfqItemId: it.rfqItemId,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        qty: it.qty.toNumber(),
        receivedQty: it.receivedQty.toNumber(),
        unitCost: it.unitCost.toNumber(),
        lineAmount: it.lineAmount.toNumber(),
        expectedDate: it.expectedDate?.toISOString().slice(0, 10) ?? null,
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX01-PO-SVC-001-F01
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
    const where: Prisma.Nx01PoWhereInput = { tenantId };
    if (opts.supplierId) where.supplierId = opts.supplierId;
    if (opts.status && ['D', 'S', 'C', 'V'].includes(opts.status)) where.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      where.poDate = {};
      if (opts.dateFrom) where.poDate.gte = parseYmd(opts.dateFrom);
      if (opts.dateTo) where.poDate.lte = parseYmd(opts.dateTo);
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
      this.prisma.nx01Po.count({ where }),
      this.prisma.nx01Po.findMany({
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
        poDate: r.poDate.toISOString().slice(0, 10),
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
   * @FUNCTION_CODE NX01-PO-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx01Po.findFirst({
      where: { id, tenantId },
      include: poDetailInclude,
    });
    if (!row) throw new NotFoundException('採購單不存在');
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

  private async assertPart(tenantId: string, partId: string) {
    const p = await this.prisma.nx00Part.findFirst({
      where: { id: partId, tenantId, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!p) throw new BadRequestException(`零件不存在：${partId}`);
    return p;
  }

  private async buildItems(tenantId: string, inputs: PoItemInputDto[]) {
    if (!inputs?.length) throw new BadRequestException('至少一筆明細');
    const out: {
      rfqItemId: string | null;
      partId: string;
      partNo: string;
      partName: string;
      qty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineAmount: Prisma.Decimal;
      expectedDate: Date | null;
      remark: string | null;
    }[] = [];
    for (const raw of inputs) {
      const part = await this.assertPart(tenantId, raw.partId);
      const qty = d(raw.qty);
      const unitCost = d(raw.unitCost);
      if (qty.lte(0) || unitCost.lt(0)) throw new BadRequestException('數量與單價須有效');
      const lineAmount = lineAmountFromQtyCost(qty, unitCost);
      let exp: Date | null = null;
      if (raw.expectedDate?.trim()) exp = parseYmd(raw.expectedDate.trim());
      out.push({
        rfqItemId: raw.rfqItemId?.trim() || null,
        partId: part.id,
        partNo: part.code,
        partName: part.name,
        qty,
        unitCost,
        lineAmount,
        expectedDate: exp,
        remark: raw.remark?.trim() ? raw.remark.trim() : null,
      });
    }
    return out;
  }

  private async maybeClosePo(
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

  /**
   * @FUNCTION_CODE NX01-PO-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreatePoBodyDto) {
    const wh = await this.assertWh(tenantId, body.warehouseId);
    await this.assertSupplier(tenantId, body.supplierId);
    const poDate = body.poDate ? parseYmd(body.poDate) : parseYmd(new Date().toISOString().slice(0, 10));
    const currencyId = body.currencyId?.trim() || (await resolveTwdCurrencyId(this.prisma));
    const taxRate = body.taxRate != null ? d(body.taxRate) : d(5);
    const items = await this.buildItems(tenantId, body.items);
    let subtotal = d(0);
    for (const it of items) subtotal = subtotal.add(it.lineAmount);
    subtotal = roundMoney2(subtotal);
    const { taxAmount, totalAmount } = calcHeaderTax(subtotal, taxRate, body.taxAmount != null ? d(body.taxAmount) : null);
    let expHead: Date | null = null;
    if (body.expectedDate?.trim()) expHead = parseYmd(body.expectedDate.trim());

    const createdId = await this.prisma.$transaction(async (tx) => {
      if (body.rfqId?.trim()) {
        const rfq = await tx.nx01Rfq.findFirst({ where: { id: body.rfqId.trim(), tenantId } });
        if (!rfq) throw new BadRequestException('來源詢價單不存在');
      }
      const no = await allocatePoDocNo(tx, tenantId, poDate, wh.code);
      const doc = await tx.nx01Po.create({
        data: {
          tenantId,
          docNo: no,
          poDate,
          supplierId: body.supplierId,
          rfqId: body.rfqId?.trim() || null,
          currencyId,
          status: 'D',
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          expectedDate: expHead,
          remark: body.remark?.trim() ? body.remark.trim() : null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: items.map((it, i) => ({
              lineNo: i + 1,
              rfqItemId: it.rfqItemId,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              qty: it.qty,
              receivedQty: d(0),
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              expectedDate: it.expectedDate,
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
   * @FUNCTION_CODE NX01-PO-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchPoBodyDto) {
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Po.findFirst({ where: { id, tenantId } });
      if (!doc) throw new NotFoundException('採購單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可修改');
      if (body.supplierId) await this.assertSupplier(tenantId, body.supplierId);

      const poDate = body.poDate ? parseYmd(body.poDate) : undefined;
      let currencyId = doc.currencyId;
      if (body.currencyId?.trim()) currencyId = body.currencyId.trim();
      let taxRate = doc.taxRate;
      if (body.taxRate != null) taxRate = d(body.taxRate);

      let itemsPayload: Awaited<ReturnType<PoService['buildItems']>> | null = null;
      if (body.items) {
        itemsPayload = await this.buildItems(tenantId, body.items);
        await tx.nx01PoItem.deleteMany({ where: { poId: id } });
        let line = 1;
        for (const it of itemsPayload) {
          await tx.nx01PoItem.create({
            data: {
              poId: id,
              lineNo: line++,
              rfqItemId: it.rfqItemId,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              qty: it.qty,
              receivedQty: d(0),
              unitCost: it.unitCost,
              lineAmount: it.lineAmount,
              expectedDate: it.expectedDate,
              remark: it.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
      }

      let subtotal = d(0);
      if (itemsPayload) {
        for (const it of itemsPayload) subtotal = subtotal.add(it.lineAmount);
      } else {
        const existing = await tx.nx01PoItem.findMany({
          where: { poId: id },
          orderBy: { lineNo: 'asc' },
        });
        for (const r of existing) subtotal = subtotal.add(r.lineAmount);
      }
      subtotal = roundMoney2(subtotal);
      const taxOverride =
        body.taxAmount !== undefined ? (body.taxAmount != null ? d(body.taxAmount) : null) : undefined;
      const { taxAmount, totalAmount } = calcHeaderTax(
        subtotal,
        taxRate,
        taxOverride === undefined ? doc.taxAmount : taxOverride,
      );

      let expHead = doc.expectedDate;
      if (body.expectedDate !== undefined) {
        expHead = body.expectedDate?.trim() ? parseYmd(body.expectedDate.trim()) : null;
      }

      await tx.nx01Po.update({
        where: { id },
        data: {
          ...(poDate ? { poDate } : {}),
          ...(body.supplierId ? { supplierId: body.supplierId } : {}),
          currencyId,
          taxRate,
          subtotal,
          taxAmount,
          totalAmount,
          ...(body.expectedDate !== undefined ? { expectedDate: expHead } : {}),
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
   * @FUNCTION_CODE NX01-PO-SVC-001-F05
   */
  async patchStatus(tenantId: string, userId: string | undefined, id: string, body: PatchPoStatusBodyDto) {
    const st = String(body.status || '').trim();
    if (!['D', 'S', 'C', 'V'].includes(st)) throw new BadRequestException('無效的狀態');
    const doc = await this.prisma.nx01Po.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('採購單不存在');
    if (doc.status === 'V' || doc.status === 'C') throw new BadRequestException('單據已結案或作廢');
    if (doc.status === 'D' && !['S', 'V'].includes(st)) {
      throw new BadRequestException('草稿僅可送出或作廢');
    }
    if (doc.status === 'S' && st !== 'C') {
      throw new BadRequestException('已送出僅可手動關閉為 C');
    }
    await this.prisma.nx01Po.update({
      where: { id },
      data: {
        status: st,
        ...(st === 'V'
          ? { voidedAt: new Date(), voidedBy: userId ?? null }
          : {}),
        updatedBy: userId ?? null,
      },
    });
    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-PO-SVC-001-F06
   */
  async toRr(tenantId: string, userId: string | undefined, poId: string, body: PoToRrBodyDto) {
    await this.assertWh(tenantId, body.warehouseId);
    const po = await this.prisma.nx01Po.findFirst({
      where: { id: poId, tenantId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('採購單不存在');
    if (po.status !== 'S') throw new BadRequestException('僅已送出之採購單可轉進貨');
    if (!body.items?.length) throw new BadRequestException('請選擇採購明細與數量');

    const defaultLoc = await this.prisma.nx00Location.findFirst({
      where: { tenantId, warehouseId: body.warehouseId, isActive: true },
      orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
      select: { id: true },
    });
    if (!defaultLoc) throw new BadRequestException('目標倉無可用庫位');

    const rrLines: {
      partId: string;
      locationId: string;
      qty: number;
      unitCost: number;
      poItemId: string;
      remark: string | null;
    }[] = [];

    for (const sel of body.items) {
      const pit = po.items.find((x) => x.id === sel.poItemId);
      if (!pit) throw new BadRequestException(`採購明細不存在：${sel.poItemId}`);
      const q = d(sel.qty);
      if (q.lte(0)) throw new BadRequestException('轉單數量須大於 0');
      const remain = pit.qty.sub(pit.receivedQty);
      if (q.gt(remain)) throw new BadRequestException(`超過可收數量（料號 ${pit.partNo}）`);

      let locId = defaultLoc.id;
      if (sel.locationId?.trim()) {
        const loc = await this.prisma.nx00Location.findFirst({
          where: {
            id: sel.locationId.trim(),
            tenantId,
            warehouseId: body.warehouseId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException(`庫位不存在或不在目標倉：${sel.locationId}`);
        locId = loc.id;
      }

      rrLines.push({
        partId: pit.partId,
        locationId: locId,
        qty: q.toNumber(),
        unitCost: pit.unitCost.toNumber(),
        poItemId: pit.id,
        remark: null,
      });
    }

    const rr = await this.rr.create(tenantId, userId, {
      warehouseId: body.warehouseId,
      supplierId: po.supplierId,
      poId: po.id,
      currencyId: po.currencyId,
      taxRate: po.taxRate.toNumber(),
      items: rrLines.map((l) => ({
        partId: l.partId,
        locationId: l.locationId,
        qty: l.qty,
        unitCost: l.unitCost,
        poItemId: l.poItemId,
        remark: l.remark,
      })),
    });

    await this.prisma.$transaction(async (tx) => {
      for (const sel of body.items) {
        const pit = await tx.nx01PoItem.findFirst({ where: { id: sel.poItemId, poId } });
        if (!pit) continue;
        const q = d(sel.qty);
        await tx.nx01PoItem.update({
          where: { id: pit.id },
          data: { receivedQty: pit.receivedQty.add(q), updatedBy: userId ?? null },
        });
      }
      await this.maybeClosePo(tx, poId, userId);
    });

    return { rrId: rr.id, rrDocNo: rr.docNo };
  }

  /**
   * @FUNCTION_CODE NX01-PO-SVC-001-F07
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx01Po.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('採購單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx01Po.update({
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
