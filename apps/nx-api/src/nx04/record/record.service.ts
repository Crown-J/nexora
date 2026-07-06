// apps/nx-api/src/nx04/record/record.service.ts
// 報價紀錄表 / 詢價紀錄表 service（NX04 紀錄表 A2）
//   兩張原子日誌的 list / create。純紀錄：建立即定稿、無編輯/作廢（日誌不改）。
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreateInquiryRecordDto,
  CreateQuoteRecordDto,
  InquiryRecordListQueryDto,
  QuoteRecordListQueryDto,
} from './dto/record.dto';

// 顯示關聯 select：料號(基準/廠牌料號/品名/廠牌) + 倉 + 幣（避免露內碼）
const PART_SEL = { code: true, secCode: true, name: true, brand: { select: { name: true } } } as const;
const WH_SEL = { code: true, name: true } as const;
const CUR_SEL = { code: true } as const;

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}

  /** 日期區間（只填起 = 該日當天）*/
  private dateRange(from?: string, to?: string) {
    const f = from?.trim();
    const t = to?.trim();
    if (!f && !t) return undefined;
    const cond: { gte?: Date; lte?: Date } = {};
    if (f) cond.gte = new Date(`${f}T00:00:00`);
    cond.lte = new Date(`${(t || f)!}T23:59:59.999`);
    return cond;
  }

  /** 建單人員查詢 → user id 清單（員編或姓名模糊）*/
  private async resolveCreatorIds(tenantId: string, creator?: string): Promise<string[] | null> {
    const c = creator?.trim();
    if (!c) return null;
    const us = await this.prisma.nx01User.findMany({
      where: {
        tenantId,
        OR: [
          { userName: { contains: c, mode: 'insensitive' } },
          { userAccount: { contains: c, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return us.map((u) => u.id);
  }

  private async loadPartSnapshot(tenantId: string, partId: string) {
    const p = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  /** 批次解析 user id → 姓名（createdBy / salesPersonId 為 id 快照、無 FK）*/
  private async resolveUserNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))];
    if (!uniq.length) return new Map();
    const us = await this.prisma.nx01User.findMany({
      where: { id: { in: uniq } },
      select: { id: true, userName: true },
    });
    return new Map(us.map((u) => [u.id, u.userName]));
  }

  private flatPart(part: { code?: string; secCode?: string; name?: string; brand?: { name?: string } | null } | null | undefined) {
    return {
      baseNo: part?.code ?? null,
      brandNo: part?.secCode ?? null,
      brandName: part?.brand?.name ?? null,
    };
  }

  // ───────────────────── 報價紀錄表（客戶側）─────────────────────

  async listQuoteRecords(user: RequestUser, q: QuoteRecordListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const and: Prisma.Nx04QuoteRecordWhereInput[] = [];
    if (q.source === 'INSTANT' || q.source === 'QUOTE') and.push({ source: q.source });
    const dr = this.dateRange(q.dateFrom, q.dateTo);
    if (dr) and.push({ recordDate: dr });
    if (q.customerId?.trim()) and.push({ customerId: q.customerId.trim() });
    if (q.customerCode?.trim())
      and.push({ customer: { code: { contains: q.customerCode.trim(), mode: 'insensitive' } } });
    if (q.customerName?.trim())
      and.push({ customer: { name: { contains: q.customerName.trim(), mode: 'insensitive' } } });
    if (q.partNo?.trim())
      and.push({ partNo: { contains: q.partNo.trim(), mode: 'insensitive' } });
    const creatorIds = await this.resolveCreatorIds(tenantId, q.creator);
    if (creatorIds !== null) and.push({ createdBy: { in: creatorIds.length ? creatorIds : ['__no_match__'] } });

    const where: Prisma.Nx04QuoteRecordWhereInput = { tenantId };
    if (and.length) where.AND = and;

    const [total, rows] = await Promise.all([
      this.prisma.nx04QuoteRecord.count({ where }),
      this.prisma.nx04QuoteRecord.findMany({
        where,
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, recordDate: true, customerId: true, customerGradeId: true,
          partId: true, partNo: true, partName: true, warehouseId: true,
          qty: true, unitPrice: true, currencyId: true, source: true, sourceDocId: true,
          salesPersonId: true, remark: true, createdAt: true, createdBy: true,
          customer: { select: { code: true, name: true } },
          part: { select: PART_SEL },
          warehouse: { select: WH_SEL },
          currency: { select: CUR_SEL },
        },
      }),
    ]);
    const userNames = await this.resolveUserNames(rows.flatMap((r) => [r.createdBy, r.salesPersonId]));
    const items = rows.map((r) => ({
      id: r.id,
      recordDate: r.recordDate,
      customerId: r.customerId,
      customerCode: r.customer?.code ?? null,
      customerName: r.customer?.name ?? null,
      customerGradeId: r.customerGradeId,
      partId: r.partId,
      partNo: r.partNo,
      partName: r.partName,
      ...this.flatPart(r.part),
      warehouseId: r.warehouseId,
      warehouseCode: r.warehouse?.code ?? null,
      warehouseName: r.warehouse?.name ?? null,
      qty: r.qty,
      unitPrice: r.unitPrice,
      currencyId: r.currencyId,
      currencyCode: r.currency?.code ?? null,
      source: r.source,
      sourceDocId: r.sourceDocId,
      salesPersonId: r.salesPersonId,
      salesPersonName: r.salesPersonId ? (userNames.get(r.salesPersonId) ?? null) : null,
      remark: r.remark,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      createdByName: userNames.get(r.createdBy) ?? null,
    }));
    return { page, pageSize, total, items };
  }

  async createQuoteRecord(user: RequestUser, dto: CreateQuoteRecordDto) {
    const tenantId = requireTenantId(user);
    const snap = await this.loadPartSnapshot(tenantId, dto.partId.trim());
    const currencyId = await resolveCurrencyId(this.prisma, dto.currencyId);
    const rec = await this.prisma.nx04QuoteRecord.create({
      data: {
        tenantId,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        customerId: dto.customerId.trim(),
        customerGradeId: dto.customerGradeId?.trim() || null,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        warehouseId: dto.warehouseId?.trim() || null,
        qty: new PrismaNs.Decimal(dto.qty),
        unitPrice: new PrismaNs.Decimal(dto.unitPrice),
        currencyId,
        source: dto.source === 'QUOTE' ? 'QUOTE' : 'INSTANT',
        sourceDocId: dto.sourceDocId?.trim() || null,
        salesPersonId: dto.salesPersonId?.trim() || user.sub,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true },
    });
    return { id: rec.id };
  }

  // ───────────────────── 詢價紀錄表（調貨/同行側）─────────────────────

  async listInquiryRecords(user: RequestUser, q: InquiryRecordListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const and: Prisma.Nx04InquiryRecordWhereInput[] = [];
    const dr = this.dateRange(q.dateFrom, q.dateTo);
    if (dr) and.push({ recordDate: dr });
    if (q.partnerCode?.trim())
      and.push({ sourcePartner: { code: { contains: q.partnerCode.trim(), mode: 'insensitive' } } });
    if (q.partnerName?.trim())
      and.push({ sourcePartner: { name: { contains: q.partnerName.trim(), mode: 'insensitive' } } });
    if (q.partNo?.trim())
      and.push({ partNo: { contains: q.partNo.trim(), mode: 'insensitive' } });
    const creatorIds = await this.resolveCreatorIds(tenantId, q.creator);
    if (creatorIds !== null) and.push({ createdBy: { in: creatorIds.length ? creatorIds : ['__no_match__'] } });

    const where: Prisma.Nx04InquiryRecordWhereInput = { tenantId };
    if (and.length) where.AND = and;

    const [total, rows] = await Promise.all([
      this.prisma.nx04InquiryRecord.count({ where }),
      this.prisma.nx04InquiryRecord.findMany({
        where,
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, recordDate: true, sourcePartnerId: true,
          partId: true, partNo: true, partName: true, warehouseId: true,
          qty: true, unitPrice: true, currencyId: true,
          salesPersonId: true, remark: true, createdAt: true, createdBy: true,
          sourcePartner: { select: { code: true, name: true } },
          part: { select: PART_SEL },
          warehouse: { select: WH_SEL },
          currency: { select: CUR_SEL },
        },
      }),
    ]);
    const userNames = await this.resolveUserNames(rows.flatMap((r) => [r.createdBy, r.salesPersonId]));
    const items = rows.map((r) => ({
      id: r.id,
      recordDate: r.recordDate,
      sourcePartnerId: r.sourcePartnerId,
      partnerCode: r.sourcePartner?.code ?? null,
      partnerName: r.sourcePartner?.name ?? null,
      partId: r.partId,
      partNo: r.partNo,
      partName: r.partName,
      ...this.flatPart(r.part),
      warehouseId: r.warehouseId,
      warehouseCode: r.warehouse?.code ?? null,
      warehouseName: r.warehouse?.name ?? null,
      qty: r.qty,
      unitPrice: r.unitPrice,
      currencyId: r.currencyId,
      currencyCode: r.currency?.code ?? null,
      salesPersonId: r.salesPersonId,
      salesPersonName: r.salesPersonId ? (userNames.get(r.salesPersonId) ?? null) : null,
      remark: r.remark,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      createdByName: userNames.get(r.createdBy) ?? null,
    }));
    return { page, pageSize, total, items };
  }

  async createInquiryRecord(user: RequestUser, dto: CreateInquiryRecordDto) {
    const tenantId = requireTenantId(user);
    const snap = await this.loadPartSnapshot(tenantId, dto.partId.trim());
    const currencyId = await resolveCurrencyId(this.prisma, dto.currencyId);
    const rec = await this.prisma.nx04InquiryRecord.create({
      data: {
        tenantId,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        sourcePartnerId: dto.sourcePartnerId.trim(),
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        warehouseId: dto.warehouseId?.trim() || null,
        qty: new PrismaNs.Decimal(dto.qty),
        unitPrice: new PrismaNs.Decimal(dto.unitPrice),
        currencyId,
        salesPersonId: dto.salesPersonId?.trim() || user.sub,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true },
    });
    return { id: rec.id };
  }
}
