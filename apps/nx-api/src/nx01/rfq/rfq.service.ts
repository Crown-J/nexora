/**
 * File: apps/nx-api/src/nx01/rfq/rfq.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RFQ-SVC-001：詢價單 CRUD、狀態、轉進貨／轉採購（PLUS）
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { PoService } from '../po/po.service';
import { RrService } from '../rr/rr.service';

import { allocateRfqDocNo } from '../utils/nx01-doc-no';
import { d, parseYmd, resolveTwdCurrencyId } from '../utils/nx01-helpers';

import type {
  CreateRfqBodyDto,
  PatchRfqBodyDto,
  PatchRfqReplyBodyDto,
  PatchRfqStatusBodyDto,
  RfqItemInputDto,
  RfqToPoBodyDto,
  RfqToRrBodyDto,
} from './dto/rfq.dto';

const rfqDetailInclude = {
  supplier: { select: { id: true, code: true, name: true } },
  items: { orderBy: { lineNo: 'asc' as const } },
} as const;

type RfqDetailRow = Prisma.Nx01RfqGetPayload<{ include: typeof rfqDetailInclude }>;

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rr: RrService,
    private readonly po: PoService,
  ) { }

  private mapDetail(row: RfqDetailRow) {
    return {
      id: row.id,
      docNo: row.docNo,
      rfqDate: row.rfqDate.toISOString().slice(0, 10),
      supplierId: row.supplierId,
      supplierCode: row.supplier?.code ?? null,
      supplierName: row.supplier?.name ?? null,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      currency: row.currency,
      status: row.status,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      voidedAt: row.voidedAt?.toISOString() ?? null,
      items: row.items.map((it) => ({
        id: it.id,
        lineNo: it.lineNo,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        qty: it.qty.toNumber(),
        unitPrice: it.unitPrice?.toNumber() ?? null,
        leadTimeDays: it.leadTimeDays,
        status: it.status,
        remark: it.remark,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F01
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
    const where: Prisma.Nx01RfqWhereInput = { tenantId };
    if (opts.supplierId) where.supplierId = opts.supplierId;
    if (opts.status && ['D', 'S', 'R', 'C', 'V'].includes(opts.status)) where.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      where.rfqDate = {};
      if (opts.dateFrom) where.rfqDate.gte = parseYmd(opts.dateFrom);
      if (opts.dateTo) where.rfqDate.lte = parseYmd(opts.dateTo);
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
      this.prisma.nx01Rfq.count({ where }),
      this.prisma.nx01Rfq.findMany({
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
        rfqDate: r.rfqDate.toISOString().slice(0, 10),
        supplierName: r.supplier?.name ?? null,
        itemCount: r._count.items,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const row = await this.prisma.nx01Rfq.findFirst({
      where: { id, tenantId },
      include: rfqDetailInclude,
    });
    if (!row) throw new NotFoundException('詢價單不存在');
    return this.mapDetail(row);
  }

  private async assertSupplierOptional(tenantId: string, supplierId: string | null | undefined) {
    if (!supplierId?.trim()) return null;
    const p = await this.prisma.nx00Partner.findFirst({
      where: { id: supplierId.trim(), tenantId, isActive: true, partnerType: 'S' },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('供應商不存在、已停用或類型非零件供應商');
    return p.id;
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

  private itemRowFromInput(
    raw: RfqItemInputDto,
    part: { id: string; code: string; name: string },
    currencyId: string,
  ) {
    const qty = d(raw.qty);
    if (qty.lte(0)) throw new BadRequestException('詢價數量須大於 0');
    const unitPrice =
      raw.unitPrice !== undefined && raw.unitPrice !== null ? d(raw.unitPrice) : null;
    if (unitPrice != null && unitPrice.lt(0)) throw new BadRequestException('單價不可為負');
    const lineStatus = unitPrice != null ? 'R' : 'P';
    return {
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      qty,
      unitPrice,
      currencyId,
      leadTimeDays: raw.leadTimeDays ?? null,
      status: lineStatus,
      remark: raw.remark?.trim() ? raw.remark.trim() : null,
    };
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateRfqBodyDto) {
    if (!body.warehouseId?.trim()) {
      throw new BadRequestException('warehouseId 為必填（單號須含倉別碼）');
    }
    const wh = await this.assertWh(tenantId, body.warehouseId);
    const supplierId = await this.assertSupplierOptional(tenantId, body.supplierId);
    const rfqDate = body.rfqDate ? parseYmd(body.rfqDate) : parseYmd(new Date().toISOString().slice(0, 10));
    const currencyId = await resolveTwdCurrencyId(this.prisma);
    if (!body.items?.length) throw new BadRequestException('至少一筆明細');

    const createdId = await this.prisma.$transaction(async (tx) => {
      const no = await allocateRfqDocNo(tx, tenantId, rfqDate, wh.code);
      const rows = [];
      for (const raw of body.items) {
        const part = await this.assertPart(tenantId, raw.partId);
        rows.push(this.itemRowFromInput(raw, part, currencyId));
      }
      const doc = await tx.nx01Rfq.create({
        data: {
          tenantId,
          docNo: no,
          rfqDate,
          supplierId,
          contactName: body.contactName?.trim() ? body.contactName.trim() : null,
          contactPhone: body.contactPhone?.trim() ? body.contactPhone.trim() : null,
          remark: body.remark?.trim() ? body.remark.trim() : null,
          status: 'D',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: rows.map((it, i) => ({
              lineNo: i + 1,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              qty: it.qty,
              unitPrice: it.unitPrice,
              currencyId: it.currencyId,
              leadTimeDays: it.leadTimeDays,
              status: it.status,
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
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchRfqBodyDto) {
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Rfq.findFirst({ where: { id, tenantId } });
      if (!doc) throw new NotFoundException('詢價單不存在');
      if (doc.status !== 'D') throw new BadRequestException('僅草稿可修改');

      const supplierId =
        body.supplierId !== undefined
          ? await this.assertSupplierOptional(tenantId, body.supplierId)
          : undefined;
      const rfqDate = body.rfqDate ? parseYmd(body.rfqDate) : undefined;
      const currencyId = await resolveTwdCurrencyId(tx);

      if (body.items) {
        if (!body.items.length) throw new BadRequestException('至少一筆明細');
        await tx.nx01RfqItem.deleteMany({ where: { rfqId: id } });
        let line = 1;
        for (const raw of body.items) {
          const part = await this.assertPart(tenantId, raw.partId);
          const row = this.itemRowFromInput(raw, part, currencyId);
          await tx.nx01RfqItem.create({
            data: {
              rfqId: id,
              lineNo: line++,
              partId: row.partId,
              partNo: row.partNo,
              partName: row.partName,
              qty: row.qty,
              unitPrice: row.unitPrice,
              currencyId: row.currencyId,
              leadTimeDays: row.leadTimeDays,
              status: row.status,
              remark: row.remark,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
      }

      await tx.nx01Rfq.update({
        where: { id },
        data: {
          ...(rfqDate ? { rfqDate } : {}),
          ...(supplierId !== undefined ? { supplierId } : {}),
          ...(body.contactName !== undefined
            ? { contactName: body.contactName?.trim() ? body.contactName.trim() : null }
            : {}),
          ...(body.contactPhone !== undefined
            ? { contactPhone: body.contactPhone?.trim() ? body.contactPhone.trim() : null }
            : {}),
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
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F05
   */
  async patchStatus(tenantId: string, userId: string | undefined, id: string, body: PatchRfqStatusBodyDto) {
    const st = String(body.status || '').trim();
    if (!['D', 'S', 'R', 'C', 'V'].includes(st)) throw new BadRequestException('無效的狀態');
    const doc = await this.prisma.nx01Rfq.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('詢價單不存在');
    if (doc.status === 'V') throw new BadRequestException('已作廢不可變更狀態');
    await this.prisma.nx01Rfq.update({
      where: { id },
      data: { status: st, updatedBy: userId ?? null },
    });
    return this.getById(tenantId, id);
  }

  /**
   * 已發出（S）時填寫供應商回覆；若所有明細均為 R 或 C，表頭轉為 R（已回覆）。
   */
  async patchReply(tenantId: string, userId: string | undefined, id: string, body: PatchRfqReplyBodyDto) {
    if (!body.items?.length) throw new BadRequestException('至少一筆明細回覆');

    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.nx01Rfq.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });
      if (!doc) throw new NotFoundException('詢價單不存在');
      if (doc.status !== 'S') throw new BadRequestException('僅「已發出」狀態可填寫供應商回覆');

      const byId = new Map(doc.items.map((x) => [x.id, x]));
      for (const row of body.items) {
        const line = byId.get(row.id);
        if (!line) throw new BadRequestException(`明細不存在：${row.id}`);
        const st = String(row.status || '').trim();
        if (st !== 'R' && st !== 'C') {
          throw new BadRequestException('明細狀態須為 R（已回覆）或 C（不採用）');
        }
        let unitPrice: Prisma.Decimal | null = null;
        let leadTimeDays: number | null = null;
        if (st === 'R') {
          if (row.unit_price === undefined || row.unit_price === null) {
            throw new BadRequestException(`已回覆之明細須填單價：${line.partNo}`);
          }
          const up = d(row.unit_price);
          if (up.lt(0)) throw new BadRequestException('單價不可為負');
          unitPrice = up;
          const leadRaw = row.lead_time_days;
          if (leadRaw === undefined) {
            leadTimeDays = line.leadTimeDays;
          } else if (leadRaw === null) {
            leadTimeDays = null;
          } else {
            const lead = Math.floor(Number(leadRaw));
            leadTimeDays = Number.isFinite(lead) ? lead : null;
          }
        }

        await tx.nx01RfqItem.update({
          where: { id: line.id },
          data: {
            unitPrice,
            leadTimeDays,
            status: st,
            updatedBy: userId ?? null,
          },
        });
      }

      const fresh = await tx.nx01RfqItem.findMany({ where: { rfqId: id } });
      const allTerminal =
        fresh.length > 0 && fresh.every((it) => it.status === 'R' || it.status === 'C');
      if (allTerminal) {
        await tx.nx01Rfq.update({
          where: { id },
          data: { status: 'R', updatedBy: userId ?? null },
        });
      }
    });

    return this.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F06
   */
  async toRr(tenantId: string, userId: string | undefined, rfqId: string, body: RfqToRrBodyDto) {
    await this.assertWh(tenantId, body.warehouseId);
    await this.assertSupplierOptional(tenantId, body.supplierId);
    if (!body.supplierId?.trim()) throw new BadRequestException('轉進貨需指定供應商');

    const rfq = await this.prisma.nx01Rfq.findFirst({
      where: { id: rfqId, tenantId },
      include: { items: true },
    });
    if (!rfq) throw new NotFoundException('詢價單不存在');
    if (rfq.status !== 'R') throw new BadRequestException('僅「已回覆」之詢價單可轉進貨');
    if (!body.items?.length) throw new BadRequestException('請選擇明細');

    const defaultLoc = await this.prisma.nx00Location.findFirst({
      where: { tenantId, warehouseId: body.warehouseId, isActive: true },
      orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
      select: { id: true },
    });
    if (!defaultLoc) throw new BadRequestException('目標倉無可用庫位');

    const rrItems: {
      partId: string;
      locationId: string;
      qty: number;
      unitCost: number;
      remark: string | null;
    }[] = [];

    for (const sel of body.items) {
      const line = rfq.items.find((x) => x.id === sel.rfqItemId);
      if (!line) throw new BadRequestException(`詢價明細不存在：${sel.rfqItemId}`);
      if (line.unitPrice == null) throw new BadRequestException(`料號 ${line.partNo} 尚未有報價，無法轉進貨`);
      const q = d(sel.qty);
      if (q.lte(0)) throw new BadRequestException('數量須大於 0');
      if (q.gt(line.qty)) throw new BadRequestException(`超過詢價數量（${line.partNo}）`);
      rrItems.push({
        partId: line.partId,
        locationId: defaultLoc.id,
        qty: q.toNumber(),
        unitCost: line.unitPrice.toNumber(),
        remark: line.remark,
      });
    }

    return this.rr.create(tenantId, userId, {
      warehouseId: body.warehouseId,
      supplierId: body.supplierId.trim(),
      rfqId: rfq.id,
      items: rrItems.map((r) => ({
        partId: r.partId,
        locationId: r.locationId,
        qty: r.qty,
        unitCost: r.unitCost,
        remark: r.remark,
      })),
    });
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F07
   */
  async toPo(tenantId: string, userId: string | undefined, rfqId: string, body: RfqToPoBodyDto) {
    const rfq = await this.prisma.nx01Rfq.findFirst({
      where: { id: rfqId, tenantId },
      include: { items: true },
    });
    if (!rfq) throw new NotFoundException('詢價單不存在');
    if (rfq.status !== 'R') throw new BadRequestException('僅「已回覆」之詢價單可轉採購');
    if (!rfq.supplierId) throw new BadRequestException('詢價單未指定供應商，無法轉採購');
    if (!body.items?.length) throw new BadRequestException('請選擇明細');

    const wh = await this.prisma.nx00Warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true },
    });
    if (!wh) throw new BadRequestException('租戶無可用倉庫，無法產生採購單號');

    const poItems: {
      partId: string;
      qty: number;
      unitCost: number;
      rfqItemId: string | null;
      remark: string | null;
    }[] = [];
    const itemIdsToSelect: string[] = [];

    for (const sel of body.items) {
      const line = rfq.items.find((x) => x.id === sel.rfqItemId);
      if (!line) throw new BadRequestException(`詢價明細不存在：${sel.rfqItemId}`);
      if (line.unitPrice == null) throw new BadRequestException(`料號 ${line.partNo} 尚未有報價`);
      const q = d(sel.qty);
      if (q.lte(0)) throw new BadRequestException('數量須大於 0');
      if (q.gt(line.qty)) throw new BadRequestException(`超過詢價數量（${line.partNo}）`);
      poItems.push({
        partId: line.partId,
        qty: q.toNumber(),
        unitCost: line.unitPrice.toNumber(),
        rfqItemId: line.id,
        remark: line.remark,
      });
      itemIdsToSelect.push(line.id);
    }

    const created = await this.po.create(tenantId, userId, {
      warehouseId: wh.id,
      supplierId: rfq.supplierId!,
      rfqId: rfq.id,
      items: poItems.map((p) => ({
        partId: p.partId,
        qty: p.qty,
        unitCost: p.unitCost,
        rfqItemId: p.rfqItemId,
        remark: p.remark,
      })),
    });

    await this.prisma.$transaction(async (tx) => {
      for (const rid of itemIdsToSelect) {
        await tx.nx01RfqItem.update({
          where: { id: rid },
          data: { status: 'S', updatedBy: userId ?? null },
        });
      }
    });

    return created;
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-SVC-001-F08
   */
  async voidDoc(tenantId: string, userId: string | undefined, id: string) {
    const doc = await this.prisma.nx01Rfq.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('詢價單不存在');
    if (doc.status !== 'D') throw new BadRequestException('僅草稿可作廢');
    const now = new Date();
    await this.prisma.nx01Rfq.update({
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
