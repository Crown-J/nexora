import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';
import { allocDocNo } from '../../shared/nx02/nx02-doc-no';
import { assertRfqStatusTransition, RfqStatus } from '../../shared/nx02/nx02-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateRfqDto,
  CreateRfqItemDto,
  PatchRfqItemDto,
  UpdateRfqDto,
} from './dto/rfq.dto';

const RFQ_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  rfqDate: true,
  supplierId: true,
  contactName: true,
  contactPhone: true,
  currency: true,
  status: true,
  remark: true,
  rfqType: true,
  rfqReason: true,
  warehouseId: true,
  validUntil: true,
  demandId: true,
  voidedAt: true,
  voidedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const ITEM_SEL = {
  id: true,
  rfqId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  currencyId: true,
  leadTimeDays: true,
  status: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type RfqRow = Prisma.Nx02RfqGetPayload<{ select: typeof RFQ_SEL }>;
type ItemRow = Prisma.Nx02RfqItemGetPayload<{ select: typeof ITEM_SEL }>;

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02RfqWhereInput {
    const where: Prisma.Nx02RfqWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertItemsEditable(status: string) {
    if (status !== RfqStatus.DRAFT && status !== RfqStatus.SENT) {
      throw new BadRequestException('RFQ line items are only editable in DRAFT or SENT');
    }
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  async list(user: RequestUser, q: Nx02ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02Rfq.count({ where }),
      this.prisma.nx02Rfq.findMany({
        where,
        orderBy: [{ rfqDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: RFQ_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Rfq.findFirst({
      where: { id, tenantId },
      select: { ...RFQ_SEL, rev_Nx02RfqItem_rfqId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('RFQ not found');
    const { rev_Nx02RfqItem_rfqId, ...rest } = row;
    return { ...rest, items: rev_Nx02RfqItem_rfqId };
  }

  /**
   * NX02-IMPL-01 Phase 3 commit 3c：RFQ 文字/JSON 匯出（廠商不登入、採購員 copy 出去寄 email）
   * 對齊 overview §3.6 廠商溝通範式 + Crown Q18「採購員手動 email 來往」
   *
   * 用途：
   *   - format=text → 純文字、適合 email 內文直接貼
   *   - format=json → 結構化、前端可生成 PDF 或自訂 layout
   *
   * 不寄 email、不寫檔、不存附件 → 純 query + format 輸出
   */
  async exportRfq(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Rfq.findFirst({
      where: { id, tenantId },
      select: {
        ...RFQ_SEL,
        supplier: { select: { code: true, name: true, contactName: true, phone: true, email: true } },
        warehouse: { select: { code: true, name: true } },
        rev_Nx02RfqItem_rfqId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('RFQ not found');

    const { rev_Nx02RfqItem_rfqId, supplier, warehouse, ...rfq } = row;

    // 結構化 payload（前端可用、JSON 格式直返）
    const payload = {
      docNo: rfq.docNo,
      rfqDate: rfq.rfqDate,
      validUntil: rfq.validUntil,
      rfqType: rfq.rfqType,
      currency: rfq.currency,
      supplier: supplier
        ? {
            code: supplier.code,
            name: supplier.name,
            contactName: rfq.contactName ?? supplier.contactName,
            phone: rfq.contactPhone ?? supplier.phone,
            email: supplier.email,
          }
        : null,
      warehouse: warehouse ? { code: warehouse.code, name: warehouse.name } : null,
      remark: rfq.remark,
      items: rev_Nx02RfqItem_rfqId.map((it) => ({
        lineNo: it.lineNo,
        partNo: it.partNo,
        partName: it.partName,
        qty: it.qty.toString(),
        leadTimeDays: it.leadTimeDays,
        remark: it.remark,
      })),
    };

    // 純文字 format（業界 muscle memory：採購員 copy 貼 email 內文）
    const lines: string[] = [];
    lines.push(`詢價單 ${payload.docNo}`);
    lines.push(`日期：${payload.rfqDate.toISOString().slice(0, 10)}`);
    if (payload.validUntil) lines.push(`有效期限：${payload.validUntil.toISOString().slice(0, 10)}`);
    lines.push('');
    if (payload.supplier) {
      lines.push(`廠商：${payload.supplier.name} (${payload.supplier.code})`);
      if (payload.supplier.contactName) lines.push(`聯絡人：${payload.supplier.contactName}`);
      if (payload.supplier.phone) lines.push(`電話：${payload.supplier.phone}`);
      if (payload.supplier.email) lines.push(`Email：${payload.supplier.email}`);
      lines.push('');
    }
    if (payload.warehouse) {
      lines.push(`入庫倉：${payload.warehouse.name} (${payload.warehouse.code})`);
      lines.push('');
    }
    lines.push('───────────────────────────────────────');
    lines.push('明細：');
    lines.push('───────────────────────────────────────');
    for (const it of payload.items) {
      lines.push(`${it.lineNo}. ${it.partNo}  ${it.partName}`);
      lines.push(`   數量：${it.qty} (${payload.currency})${it.leadTimeDays ? `  交期：${it.leadTimeDays} 天` : ''}`);
      if (it.remark) lines.push(`   備註：${it.remark}`);
    }
    lines.push('───────────────────────────────────────');
    if (payload.remark) {
      lines.push('');
      lines.push(`備註：${payload.remark}`);
    }
    lines.push('');
    lines.push('煩請回覆單價 + 交期、謝謝。');

    return {
      text: lines.join('\n'),
      payload,
    };
  }

  async create(user: RequestUser, dto: CreateRfqDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new NotFoundException('warehouseId not found');
      if (dto.supplierId) {
        const sup = await tx.nx01Partner.findFirst({
          where: { id: dto.supplierId, tenantId },
          select: { id: true },
        });
        if (!sup) throw new NotFoundException('supplierId not found');
      }
      const docNo = await allocDocNo(tx, tenantId, 'RF', wh.code);
      const rfq = await tx.nx02Rfq.create({
        data: {
          tenantId,
          docNo,
          rfqDate: new Date(dto.rfqDate),
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId?.trim() || null,
          contactName: dto.contactName?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          currency: dto.currency?.trim() || 'TWD',
          remark: dto.remark?.trim() || null,
          rfqType: dto.rfqType?.trim() || 'G',
          rfqReason: dto.rfqReason?.trim() || null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          demandId: dto.demandId?.trim() || null,
          status: RfqStatus.DRAFT,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: RFQ_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
        const lineCurrId = await resolveCurrencyId(tx, it.currencyId ?? dto.currency ?? 'TWD');
        await tx.nx02RfqItem.create({
          data: {
            rfqId: rfq.id,
            lineNo: line++,
            partId: it.partId.trim(),
            partNo: snap.partNo,
            partName: snap.partName,
            qty: new PrismaNs.Decimal(it.qty),
            unitPrice: it.unitPrice != null ? new PrismaNs.Decimal(it.unitPrice) : null,
            currencyId: lineCurrId,
            leadTimeDays: it.leadTimeDays ?? null,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx02Rfq.findFirst({
        where: { id: rfq.id },
        select: { ...RFQ_SEL, rev_Nx02RfqItem_rfqId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_rfq',
        entityId: rfq.id,
        entityCode: rfq.docNo,
        summary: '建立詢價單',
        afterData: full as object,
      });
      const { rev_Nx02RfqItem_rfqId, ...r } = full!;
      return { ...r, items: rev_Nx02RfqItem_rfqId };
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateRfqDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rfq.findFirst({ where: { id, tenantId }, select: RFQ_SEL });
    if (!existing) throw new NotFoundException('RFQ not found');
    if (existing.voidedAt) throw new BadRequestException('RFQ is voided');
    if (dto.supplierId !== undefined && dto.supplierId !== null) {
      const sup = await this.prisma.nx01Partner.findFirst({
        where: { id: dto.supplierId, tenantId },
        select: { id: true },
      });
      if (!sup) throw new NotFoundException('supplierId not found');
    }
    let nextStatus = existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      assertRfqStatusTransition(existing.status, dto.status);
      nextStatus = dto.status;
    }
    const row = await this.prisma.nx02Rfq.update({
      where: { id },
      data: {
        ...(dto.rfqDate !== undefined ? { rfqDate: new Date(dto.rfqDate) } : {}),
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
        ...(dto.status !== undefined ? { status: nextStatus } : {}),
        updatedBy: user.sub,
      },
      select: RFQ_SEL,
    });
    const full = await this.prisma.nx02Rfq.findFirst({
      where: { id },
      select: { ...RFQ_SEL, rev_Nx02RfqItem_rfqId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_rfq',
      entityId: id,
      entityCode: row.docNo,
      summary: '修改詢價單',
      beforeData: existing as object,
      afterData: full as object,
    });
    const { rev_Nx02RfqItem_rfqId, ...r } = full!;
    return { ...r, items: rev_Nx02RfqItem_rfqId };
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rfq.findFirst({ where: { id, tenantId }, select: RFQ_SEL });
    if (!existing) throw new NotFoundException('RFQ not found');
    if (existing.voidedAt) throw new BadRequestException('RFQ already voided');
    assertRfqStatusTransition(existing.status, RfqStatus.CANCELLED);
    const row = await this.prisma.nx02Rfq.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedBy: user.sub,
        status: RfqStatus.CANCELLED,
        updatedBy: user.sub,
      },
      select: RFQ_SEL,
    });
    const full = await this.prisma.nx02Rfq.findFirst({
      where: { id },
      select: { ...RFQ_SEL, rev_Nx02RfqItem_rfqId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rfq',
      entityId: id,
      entityCode: row.docNo,
      summary: '作廢詢價單',
      beforeData: existing as object,
      afterData: full as object,
    });
    const { rev_Nx02RfqItem_rfqId, ...r } = full!;
    return { ...r, items: rev_Nx02RfqItem_rfqId };
  }

  async addItem(user: RequestUser, rfqId: string, dto: CreateRfqItemDto) {
    const tenantId = requireTenantId(user);
    const rfq = await this.prisma.nx02Rfq.findFirst({ where: { id: rfqId, tenantId }, select: RFQ_SEL });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.voidedAt) throw new BadRequestException('RFQ is voided');
    this.assertItemsEditable(rfq.status);
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const lineCurrId = await resolveCurrencyId(this.prisma, dto.currencyId ?? rfq.currency ?? 'TWD');
    const maxLine = await this.prisma.nx02RfqItem.aggregate({
      where: { rfqId },
      _max: { lineNo: true },
    });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const row = await this.prisma.nx02RfqItem.create({
      data: {
        rfqId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        qty: new PrismaNs.Decimal(dto.qty),
        unitPrice: dto.unitPrice != null ? new PrismaNs.Decimal(dto.unitPrice) : null,
        currencyId: lineCurrId,
        leadTimeDays: dto.leadTimeDays ?? null,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CREATE',
      entityTable: 'nx02_rfq_item',
      entityId: row.id,
      entityCode: rfq.docNo,
      summary: '新增詢價明細',
      afterData: row as object,
    });
    return row;
  }

  async patchItem(user: RequestUser, rfqId: string, itemId: string, dto: PatchRfqItemDto) {
    const tenantId = requireTenantId(user);
    const rfq = await this.prisma.nx02Rfq.findFirst({ where: { id: rfqId, tenantId }, select: RFQ_SEL });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.voidedAt) throw new BadRequestException('RFQ is voided');
    this.assertItemsEditable(rfq.status);
    const existing = await this.prisma.nx02RfqItem.findFirst({ where: { id: itemId, rfqId }, select: ITEM_SEL });
    if (!existing) throw new NotFoundException('RFQ item not found');
    const row = await this.prisma.nx02RfqItem.update({
      where: { id: itemId },
      data: {
        ...(dto.qty !== undefined ? { qty: new PrismaNs.Decimal(dto.qty) } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice == null ? null : new PrismaNs.Decimal(dto.unitPrice) } : {}),
        ...(dto.leadTimeDays !== undefined ? { leadTimeDays: dto.leadTimeDays } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_rfq_item',
      entityId: itemId,
      entityCode: rfq.docNo,
      summary: '修改詢價明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, rfqId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const rfq = await this.prisma.nx02Rfq.findFirst({ where: { id: rfqId, tenantId }, select: RFQ_SEL });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.voidedAt) throw new BadRequestException('RFQ is voided');
    this.assertItemsEditable(rfq.status);
    const existing = await this.prisma.nx02RfqItem.findFirst({ where: { id: itemId, rfqId }, select: ITEM_SEL });
    if (!existing) throw new NotFoundException('RFQ item not found');
    await this.prisma.nx02RfqItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rfq_item',
      entityId: itemId,
      entityCode: rfq.docNo,
      summary: '刪除詢價明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}
