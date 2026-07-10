// apps/nx-api/src/nx02/ti/ti.service.ts
// NX02-TI-SHELL 2026-07-11：同行調貨單管理面首發（此前只有產生入口、無列表/詳情/狀態流）。
//   狀態流：D 草稿 → S 已發出 → R 已回覆 →〔轉進貨〕→ P 待驗收 →〔RR 過帳回寫〕→ C 已完成；D/S/R → V 作廢
//   帳務（執行長拍板「帳跟貨走」）：TI 不立應付；轉出的 RR 過帳時由 createApFromPostedRr 認列。
//     shared/nx05/nx05-create-ap-from-ti.ts 刻意不接（接了會與 RR 應付重複）、保留備「不經進貨直接結帳」特殊場景。
//   回寫鏈：作廢 TI / 移除 TI 明細行 → 來源 SO 缺貨行退回 待補（transferStatus='P'、tiId=null）；
//     RR(tiId) 過帳 → TI→C + SO 行→補貨完成（寫在 rr.service 過帳交易內）。

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
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';
import { assertTiStatusTransition, tiApiToDb, tiDbToApi, TiStatus } from '../../shared/nx02/nx02-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { RrService } from '../rr/rr.service';

import type { PatchTiItemDto, TiToRrDto, UpdateTiDto } from './dto/ti.dto';

const TI_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  tiDate: true,
  warehouseId: true,
  partnerId: true,
  rfqId: true,
  currencyId: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // 單據模板 enrich——關聯名稱由 flattenTiRefs 攤平（比照 Po/RrService）
  partner: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  rfq: { select: { docNo: true } },
} as const;

const TI_ITEM_SEL = {
  id: true,
  tiId: true,
  rfqItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  unitCost: true,
  lineAmount: true,
  remark: true,
  sourceSoItemId: true,
  sourceInquiryRecordId: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  part: { select: { secCode: true } },
} as const;

type TiHead = Prisma.Nx02TiGetPayload<{ select: typeof TI_SEL }>;

// 把 TI_SEL 帶的 partner/warehouse/rfq 關聯攤平成 partnerCode/partnerName/warehouseCode/warehouseName/rfqDocNo
function flattenTiRefs<T extends Record<string, unknown>>(rest: T) {
  const { partner, warehouse, rfq, ...plain } = rest as Record<string, unknown> & {
    partner?: { code?: string; name?: string } | null;
    warehouse?: { code?: string; name?: string } | null;
    rfq?: { docNo?: string } | null;
  };
  return {
    ...plain,
    partnerCode: partner?.code ?? null,
    partnerName: partner?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    warehouseName: warehouse?.name ?? null,
    rfqDocNo: rfq?.docNo ?? null,
  };
}

@Injectable()
export class TiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly rrService: RrService,
  ) {}

  private mapTiHead(row: TiHead) {
    return { ...row, status: tiDbToApi(row.status) };
  }

  /** 明細/表頭可編狀態（DB 短碼）：D 草稿 / S 已發出 / R 已回覆 */
  private assertTiEditable(statusDb: string) {
    if (statusDb !== 'D' && statusDb !== 'S' && statusDb !== 'R') {
      throw new BadRequestException('TI is only editable in DRAFT / SENT / REPLIED');
    }
  }

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02TiWhereInput {
    const where: Prisma.Nx02TiWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) {
      const s = q.status.trim();
      // 收 API 全名（轉 DB 短碼）、也容忍直接給短碼
      where.status = s.length === 1 ? s : tiApiToDb(s);
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { partner: { code: { contains: s, mode: 'insensitive' } } },
        { partner: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private async recalcTiTotals(tx: Prisma.TransactionClient, tiId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx02TiItem.findMany({ where: { tiId }, select: { lineAmount: true } });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx02Ti.update({
      where: { id: tiId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  /** 來源 SO 缺貨行退回待補（作廢 TI / 移除 TI 明細行時；只動仍連著本 TI 的行） */
  private async resetSoLines(tx: Prisma.TransactionClient, tiId: string, soItemIds: string[], userId: string) {
    if (!soItemIds.length) return;
    await tx.nx04SoItem.updateMany({
      where: { id: { in: soItemIds }, tiId },
      data: { transferStatus: 'P', tiId: null, updatedBy: userId },
    });
  }

  async list(user: RequestUser, q: Nx02ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02Ti.count({ where }),
      this.prisma.nx02Ti.findMany({
        where,
        orderBy: [{ tiDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: { ...TI_SEL, _count: { select: { rev_Nx02TiItem_tiId: true } } },
      }),
    ]);
    // 建單人員名（批次查 user）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({ where: { id: { in: creatorIds } }, select: { id: true, userName: true } })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c.userName]));
    const items = rows.map((r) => {
      const { _count, ...rest } = r;
      return {
        ...flattenTiRefs(this.mapTiHead(rest)),
        itemCount: _count?.rev_Nx02TiItem_tiId ?? 0,
        createdByName: creatorMap.get(r.createdBy) ?? null,
      };
    });
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Ti.findFirst({
      where: { id, tenantId },
      select: { ...TI_SEL, rev_Nx02TiItem_tiId: { orderBy: { lineNo: 'asc' }, select: TI_ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('TI not found');
    const { rev_Nx02TiItem_tiId, ...rest } = row;

    // 明細來源銷貨單號（sourceSoItemId → SoItem.soId → So.docNo、兩段批次查）
    const soItemIds = [...new Set(rev_Nx02TiItem_tiId.map((it) => it.sourceSoItemId).filter(Boolean))];
    const soItems = soItemIds.length
      ? await this.prisma.nx04SoItem.findMany({ where: { id: { in: soItemIds } }, select: { id: true, soId: true } })
      : [];
    const soIds = [...new Set(soItems.map((s) => s.soId))];
    const sos = soIds.length
      ? await this.prisma.nx04So.findMany({ where: { id: { in: soIds } }, select: { id: true, docNo: true } })
      : [];
    const soDocMap = new Map(sos.map((s) => [s.id, s.docNo]));
    const soItemDocMap = new Map(soItems.map((s) => [s.id, soDocMap.get(s.soId) ?? null]));

    // 已轉出的進貨單（追蹤用）
    const rrs = await this.prisma.nx02Rr.findMany({
      where: { tiId: id, tenantId, voidedAt: null },
      select: { id: true, docNo: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // 建單人員名（詳情顯示）
    const creator = row.createdBy
      ? await this.prisma.nx01User.findFirst({ where: { id: row.createdBy }, select: { userName: true } })
      : null;

    return {
      ...flattenTiRefs(this.mapTiHead(rest)),
      items: rev_Nx02TiItem_tiId.map((it) => {
        const { part, ...itemRest } = it;
        return {
          ...itemRest,
          unitPriceSnapshot: it.unitCost,
          secCode: part?.secCode ?? null,
          sourceSoDocNo: soItemDocMap.get(it.sourceSoItemId) ?? null,
        };
      }),
      relatedRrs: rrs,
      createdByName: creator?.userName ?? null,
    };
  }

  async update(user: RequestUser, id: string, dto: UpdateTiDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Ti.findFirst({ where: { id, tenantId }, select: TI_SEL });
    if (!existing) throw new NotFoundException('TI not found');
    if (existing.voidedAt) throw new BadRequestException('TI is voided');

    if (dto.status !== undefined) {
      const fromApi = tiDbToApi(existing.status);
      if (dto.status !== fromApi) {
        assertTiStatusTransition(fromApi, dto.status);
        // P/C 由系統寫（轉進貨 / RR 過帳回寫）、不收手動
        if (dto.status === TiStatus.PENDING_RECEIPT || dto.status === TiStatus.COMPLETED) {
          throw new BadRequestException('PENDING_RECEIPT/COMPLETED are system-driven (via to-rr / RR posting)');
        }
        // 作廢走 DELETE（要連動退回 SO 行）、不收 status=CANCELLED
        if (dto.status === TiStatus.CANCELLED) {
          throw new BadRequestException('Use DELETE /nx02/ti/:id to void (unlinks source SO lines)');
        }
      }
    }
    if (dto.tiDate !== undefined || dto.taxRate !== undefined || dto.remark !== undefined) {
      this.assertTiEditable(existing.status);
    }

    const taxRate =
      dto.taxRate !== undefined ? new PrismaNs.Decimal(dto.taxRate) : new PrismaNs.Decimal(existing.taxRate);

    return this.prisma.$transaction(async (tx) => {
      await tx.nx02Ti.update({
        where: { id },
        data: {
          ...(dto.tiDate !== undefined ? { tiDate: new Date(dto.tiDate) } : {}),
          ...(dto.status !== undefined ? { status: tiApiToDb(dto.status) } : {}),
          ...(dto.taxRate !== undefined ? { taxRate } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.taxRate !== undefined) await this.recalcTiTotals(tx, id, taxRate);
      const full = await tx.nx02Ti.findFirst({
        where: { id },
        select: { ...TI_SEL, rev_Nx02TiItem_tiId: { orderBy: { lineNo: 'asc' }, select: TI_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'UPDATE',
        entityTable: 'nx02_ti',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status ? `同行調貨單狀態 → ${dto.status}` : '修改同行調貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      const { rev_Nx02TiItem_tiId, ...rest } = full!;
      return {
        ...flattenTiRefs(this.mapTiHead(rest)),
        items: rev_Nx02TiItem_tiId.map((it) => {
          const { part, ...itemRest } = it;
          return { ...itemRest, unitPriceSnapshot: it.unitCost, secCode: part?.secCode ?? null };
        }),
      };
    });
  }

  /** 作廢：D/S/R 可作廢；連動來源 SO 缺貨行退回待補（可重新找別家同行調） */
  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Ti.findFirst({
      where: { id, tenantId },
      select: { ...TI_SEL, rev_Nx02TiItem_tiId: { select: { sourceSoItemId: true } } },
    });
    if (!existing) throw new NotFoundException('TI not found');
    if (existing.voidedAt) throw new BadRequestException('TI is already voided');
    assertTiStatusTransition(tiDbToApi(existing.status), TiStatus.CANCELLED);

    return this.prisma.$transaction(async (tx) => {
      await tx.nx02Ti.update({
        where: { id },
        data: { status: 'V', voidedAt: new Date(), voidedBy: user.sub, updatedBy: user.sub },
      });
      const soItemIds = existing.rev_Nx02TiItem_tiId.map((it) => it.sourceSoItemId).filter(Boolean);
      await this.resetSoLines(tx, id, soItemIds, user.sub);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'VOID',
        entityTable: 'nx02_ti',
        entityId: id,
        entityCode: existing.docNo,
        summary: `作廢同行調貨單（${soItemIds.length} 個來源銷貨行退回待補）`,
        beforeData: existing as object,
      });
      return { id, status: TiStatus.CANCELLED, resetSoLines: soItemIds.length };
    });
  }

  /** 明細量價編輯（D/S/R；同行回價回填單價的主入口） */
  async patchItem(user: RequestUser, tiId: string, itemId: string, dto: PatchTiItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx02Ti.findFirst({ where: { id: tiId, tenantId }, select: TI_SEL });
    if (!head) throw new NotFoundException('TI not found');
    this.assertTiEditable(head.status);
    const item = await this.prisma.nx02TiItem.findFirst({ where: { id: itemId, tiId }, select: TI_ITEM_SEL });
    if (!item) throw new NotFoundException('TI item not found');

    if (dto.locationId) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId, tenantId, warehouseId: head.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to TI warehouse');
    }

    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(item.qty);
    if (qty.lte(0)) throw new BadRequestException('qty must be > 0');
    const unit =
      dto.unitPriceSnapshot !== undefined ? new PrismaNs.Decimal(dto.unitPriceSnapshot) : new PrismaNs.Decimal(item.unitCost);
    const lineAmount = qty.mul(unit).toDecimalPlaces(2);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.nx02TiItem.update({
        where: { id: itemId },
        data: {
          ...(dto.qty !== undefined ? { qty } : {}),
          ...(dto.unitPriceSnapshot !== undefined ? { unitCost: unit } : {}),
          lineAmount,
          ...(dto.locationId !== undefined ? { locationId: dto.locationId?.trim() || null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
        select: TI_ITEM_SEL,
      });
      await this.recalcTiTotals(tx, tiId, new PrismaNs.Decimal(head.taxRate));
      const { part, ...itemRest } = row;
      return { ...itemRest, unitPriceSnapshot: row.unitCost, secCode: part?.secCode ?? null };
    });
  }

  /** 移除明細行（僅 D；連動來源 SO 行退回待補） */
  async removeItem(user: RequestUser, tiId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx02Ti.findFirst({ where: { id: tiId, tenantId }, select: TI_SEL });
    if (!head) throw new NotFoundException('TI not found');
    if (head.status !== 'D') throw new BadRequestException('TI lines are only removable in DRAFT');
    const item = await this.prisma.nx02TiItem.findFirst({
      where: { id: itemId, tiId },
      select: { id: true, sourceSoItemId: true },
    });
    if (!item) throw new NotFoundException('TI item not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.nx02TiItem.delete({ where: { id: itemId } });
      await this.resetSoLines(tx, tiId, item.sourceSoItemId ? [item.sourceSoItemId] : [], user.sub);
      await this.recalcTiTotals(tx, tiId, new PrismaNs.Decimal(head.taxRate));
      return { ok: true };
    });
  }

  /**
   * 轉進貨（比照 PoService.toRr）：勾行+收量+庫位 → 建草稿 RR（供應商=同行、tiId 回鏈）→ TI → P 待驗收。
   * 帳務：應付由 RR 過帳認列（TI 不立帳）；TI→C 與 SO 行補貨完成由 RR 過帳回寫（rr.service）。
   */
  async toRr(user: RequestUser, tiId: string, dto: TiToRrDto) {
    const tenantId = requireTenantId(user);
    const ti = await this.prisma.nx02Ti.findFirst({
      where: { id: tiId, tenantId, voidedAt: null },
      select: { ...TI_SEL, rev_Nx02TiItem_tiId: { select: TI_ITEM_SEL } },
    });
    if (!ti) throw new NotFoundException('TI not found');
    // D/S/R 皆可轉（實務上貨先到很常見）；轉過（P/C）不可再轉
    this.assertTiEditable(ti.status);
    assertTiStatusTransition(tiDbToApi(ti.status), TiStatus.PENDING_RECEIPT);
    if (!dto.items?.length) throw new BadRequestException('items required');

    const itemMap = new Map(ti.rev_Nx02TiItem_tiId.map((it) => [it.id, it]));
    const rrItems: { partId: string; locationId: string; qty: number; unitPriceSnapshot: number }[] = [];
    for (const i of dto.items) {
      const it = itemMap.get(i.tiItemId);
      if (!it) throw new BadRequestException(`tiItemId ${i.tiItemId} not in TI`);
      if (i.qty <= 0) throw new BadRequestException(`qty must be > 0 for ${it.partNo}`);
      if (i.qty > Number(it.qty)) throw new BadRequestException(`qty ${i.qty} exceeds TI qty ${Number(it.qty)} for ${it.partNo}`);
      if (!i.locationId?.trim()) throw new BadRequestException('locationId required for every item');
      rrItems.push({
        partId: it.partId,
        locationId: i.locationId.trim(),
        qty: i.qty,
        unitPriceSnapshot: Number(it.unitCost),
      });
    }

    const rr = await this.rrService.create(user, {
      rrDate: new Date().toISOString().slice(0, 10),
      warehouseId: dto.warehouseId,
      supplierId: ti.partnerId,
      tiId,
      taxRate: Number(ti.taxRate),
      items: rrItems,
    });

    await this.prisma.nx02Ti.update({
      where: { id: tiId },
      data: { status: 'P', updatedBy: user.sub },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CONVERT',
      entityTable: 'nx02_ti',
      entityId: tiId,
      entityCode: ti.docNo,
      summary: `同行調貨轉進貨（RR ${(rr as { docNo?: string }).docNo ?? ''}）、TI → 待驗收`,
    });
    return rr;
  }
}
