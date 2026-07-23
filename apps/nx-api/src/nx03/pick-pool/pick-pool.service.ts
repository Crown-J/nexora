// apps/nx-api/src/nx03/pick-pool/pick-pool.service.ts
// 撿貨清單 service（SALES-FLOW 撿貨重設計 2026-07-22 執行長拍板）
//
// 業務語意：撿貨以「庫位」為軸、不是銷貨單。清單＝依庫位分組、同（倉×料件）合併總量的撿貨任務列。
//   支援部分撿：每行記已撿量／剩餘量，可分次撿；剩餘量繼續掛待撿。
//   異常回報＝對「還沒撿到的剩餘量」開正式異常回報單（接六處置流程）。重置數量＝把已撿量反寫歸零。
//   伺服器為準：每個動作即時落地、冪等由「動作後重抓真實狀態」保證（網路不穩策略）。
//
// 底層：撿到的落 nx03_pk_item(status=C、qty=實撿)、異常剩餘落 nx03_pk_item(status=M)＋開 issue-report；
//   一 SO 一張隱形撿貨單(status 停 C 累積)。行全數帳平(已撿+異常=需求)才推進 fulfillStatus W→PK。
//   撿貨不扣帳（扣庫存/開應收依 D4/D6 移到簽收）。

import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { advanceSoItemsFulfill } from '../../shared/nx03/nx03-fulfill-advance';
import { moveLocationBalance, resolveStorageBin, resolveSystemBin, SystemBinType } from '../../shared/nx03/nx03-location-move';
import { PkStatus } from '../../shared/nx03/nx03-state-machine';
import { SoStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { IssueReportService } from '../issue-report/issue-report.service';

import type { PickAggregateDto, PickListQueryDto, ReportPickIssueDto, ResetPickDto, StagedActionDto, StagedIssueDto, StagedListQueryDto } from './dto/pick-pool.dto';

/** 撿貨任務列（同 倉×料件 合併總量）。 */
interface PickItem {
  warehouseId: string;
  warehouseCode: string;
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  photoId: string | null;
  locationId: string | null;
  locationCode: string | null;
  customerName?: string | null; // 依客戶分組時有值（同客戶×料件合併）
  neededQty: string; // 需求總量（此料件在池內未結行的需求）
  pickedQty: string; // 已撿量
  remainingQty: string; // 剩餘待撿（needed - picked）
  soItemIds: string[];
}

interface PickGroup {
  title: string; // 分組標題（依庫位＝庫位碼 / 依客戶＝客戶名）
  locationId: string | null;
  locationCode: string | null;
  warehouseCode: string;
  items: PickItem[];
}

/** 內部：某料件某行的撿貨進度。 */
interface LineProgress {
  soItemId: string;
  soId: string;
  deliveryType: string;
  soStatus: string;
  partNo: string;
  partName: string;
  qty: number; // 需求
  picked: number; // 已撿（C）
}

@Injectable()
export class PickPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly issueReport: IssueReportService,
  ) {}

  // ── 撿貨清單 ──────────────────────────────────────────────

  async getPickList(user: RequestUser, q: PickListQueryDto): Promise<{ groups: PickGroup[]; total: number; lineCount: number }> {
    const tenantId = requireTenantId(user);
    const byCustomer = q.groupBy === 'customer';
    const where: Prisma.Nx04SoItemWhereInput = {
      transferStatus: 'C',
      fulfillStatus: 'W', // 未結行（全數帳平才推進 PK 離開清單）
      so: { tenantId, cancelledAt: null, status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] } },
    };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { brandName: { contains: s, mode: 'insensitive' } },
        { so: { is: { customer: { name: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const rows = await this.prisma.nx04SoItem.findMany({
      where,
      select: {
        id: true, warehouseId: true, partId: true, partNo: true, partName: true, brandName: true, qty: true,
        so: { select: { customerId: true, customer: { select: { name: true } } } },
      },
    });
    if (!rows.length) return { groups: [], total: 0, lineCount: 0 };

    const pickedByLine = await this.pickedQtyByLine(this.prisma, rows.map((r) => r.id));
    const partIds = [...new Set(rows.map((r) => r.partId))];
    const whIds = [...new Set(rows.map((r) => r.warehouseId))];
    const settings = await this.prisma.nx03PartStockSetting.findMany({
      where: { tenantId, partId: { in: partIds }, warehouseId: { in: whIds } },
      select: { partId: true, warehouseId: true, defaultLocationId: true },
    });
    const locByKey = new Map(settings.map((s) => [`${s.warehouseId}|${s.partId}`, s.defaultLocationId]));
    const locIds = [...new Set(settings.map((s) => s.defaultLocationId).filter((x): x is string => !!x))];
    const locs = locIds.length
      ? await this.prisma.nx01Location.findMany({ where: { id: { in: locIds } }, select: { id: true, code: true } })
      : [];
    const locCode = new Map(locs.map((l) => [l.id, l.code]));
    const whs = await this.prisma.nx01Warehouse.findMany({ where: { id: { in: whIds } }, select: { id: true, code: true } });
    const whCode = new Map(whs.map((w) => [w.id, w.code]));
    const photos = await this.prisma.nx01PartPhoto.findMany({
      where: { partId: { in: partIds } }, orderBy: { sortNo: 'asc' }, select: { id: true, partId: true },
    });
    const photoByPart = new Map<string, string>();
    for (const p of photos) if (!photoByPart.has(p.partId)) photoByPart.set(p.partId, p.id);

    // 分組維度：依庫位＝合併同（倉×料件）；依客戶＝合併同（客戶×料件）
    interface Agg extends Omit<PickItem, 'neededQty' | 'pickedQty' | 'remainingQty'> { customerId: string | null; customerName: string | null; _need: number; _picked: number }
    const agg = new Map<string, Agg>();
    let lineCount = 0;
    for (const r of rows) {
      const need = Number(r.qty);
      const picked = pickedByLine.get(r.id) ?? 0;
      if (need - picked <= 0) continue;
      lineCount++;
      const whPartKey = `${r.warehouseId}|${r.partId}`;
      const custId = r.so?.customerId ?? null;
      const key = byCustomer ? `${custId ?? '_'}|${r.partId}` : whPartKey;
      let a = agg.get(key);
      if (!a) {
        const locId = locByKey.get(whPartKey) ?? null;
        a = {
          warehouseId: r.warehouseId, warehouseCode: whCode.get(r.warehouseId) ?? '',
          partId: r.partId, partNo: r.partNo, partName: r.partName, brandName: r.brandName ?? null,
          photoId: photoByPart.get(r.partId) ?? null,
          locationId: locId, locationCode: locId ? (locCode.get(locId) ?? null) : null,
          customerId: custId, customerName: r.so?.customer?.name ?? null,
          soItemIds: [], _need: 0, _picked: 0,
        };
        agg.set(key, a);
      }
      a._need += need; a._picked += picked; a.soItemIds.push(r.id);
    }

    const items: PickItem[] = [...agg.values()].map((a) => ({
      warehouseId: a.warehouseId, warehouseCode: a.warehouseCode,
      partId: a.partId, partNo: a.partNo, partName: a.partName, brandName: a.brandName, photoId: a.photoId,
      locationId: a.locationId, locationCode: a.locationCode, customerName: a.customerName,
      neededQty: String(a._need), pickedQty: String(a._picked), remainingQty: String(a._need - a._picked),
      soItemIds: a.soItemIds,
    }));

    const keyOf = (c: string | null) => (c == null ? '￿' : c);
    const groups = new Map<string, PickGroup>();
    for (const it of items) {
      const gk = byCustomer ? (it.customerName ?? '__none__') : (it.locationId ?? '__none__');
      let g = groups.get(gk);
      if (!g) {
        g = {
          title: byCustomer ? (it.customerName ?? '未指定客戶') : (it.locationCode ?? '未指定庫位'),
          locationId: it.locationId, locationCode: it.locationCode, warehouseCode: it.warehouseCode, items: [],
        };
        groups.set(gk, g);
      }
      g.items.push(it);
    }
    for (const g of groups.values()) g.items.sort((x, y) => x.partNo.localeCompare(y.partNo));
    const groupList = [...groups.values()].sort((a, b) => keyOf(a.title).localeCompare(keyOf(b.title)));
    return { groups: groupList, total: items.length, lineCount };
  }

  // ── 撿取（部分／全部） ────────────────────────────────────

  async pickAggregate(user: RequestUser, dto: PickAggregateDto) {
    const tenantId = requireTenantId(user);
    const warehouseId = dto.warehouseId.trim();
    const partId = dto.partId.trim();
    return this.prisma.$transaction(async (tx) => {
      const lines = await this.loadLineProgress(tx, tenantId, warehouseId, partId);
      if (!lines.length) throw new BadRequestException('目前沒有可撿的待撿項（可能已撿完或單據已取消）');
      const totalRemaining = lines.reduce((n, l) => n + (l.qty - l.picked), 0);
      if (totalRemaining <= 0) throw new BadRequestException('此料件已無剩餘待撿量');
      let left = dto.qty != null ? Math.min(dto.qty, totalRemaining) : totalRemaining;
      if (left <= 0) throw new BadRequestException('撿取數量須大於 0');
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const locId = await this.defaultLocationId(tx, tenantId, partId, warehouseId);
      // WMS P2：撿貨＝把貨從原儲位搬到待包暫存（K）
      const storageBin = await resolveStorageBin(tx, tenantId, partId, warehouseId);
      const packBin = await resolveSystemBin(tx, tenantId, warehouseId, SystemBinType.PACK_STAGING);

      const fullyDone: string[] = [];
      const touchedSoIds = new Set<string>();
      let pickedTotal = 0;
      for (const l of lines) {
        if (left <= 0) break;
        const lineRemaining = l.qty - l.picked;
        if (lineRemaining <= 0) continue;
        const take = Math.min(lineRemaining, left);
        const pk = await this.ensureHiddenPk(tx, user, tenantId, {
          id: l.soId,
          deliveryType: l.deliveryType,
          warehouseId,
          warehouseCode: wh.code,
        });
        await this.appendPkItem(tx, user, pk.id, partId, l, locId, take, 'C');
        // WMS P2：實體搬移 原儲位 → 待包暫存（倉庫餘額不變、只重分佈庫位）
        await moveLocationBalance(tx, {
          tenantId, partId, warehouseId,
          fromLocationId: storageBin, toLocationId: packBin, qty: take, userId: user.sub,
        });
        if (pk.status === PkStatus.PENDING) {
          await tx.nx03Pk.update({
            where: { id: pk.id },
            data: { status: PkStatus.COUNTING, startedAt: new Date(), updatedBy: user.sub },
          });
        }
        // SO CONFIRMED→PICKING
        if (l.soStatus === SoStatus.CONFIRMED) {
          await tx.nx04So.update({ where: { id: l.soId }, data: { status: SoStatus.PICKING, updatedBy: user.sub } });
          l.soStatus = SoStatus.PICKING;
        }
        touchedSoIds.add(l.soId);
        left -= take;
        pickedTotal += take;
        if (l.picked + take >= l.qty) fullyDone.push(l.soItemId); // 帳平（已撿=需求）
      }
      // 撿貨開始時間戳（單據計時 KPI 起點）：第一次撿貨動作只寫一次（pick_started_at null 才蓋）
      await this.stampPickStarted(tx, user, [...touchedSoIds]);
      // 全數帳平的行 → fulfillStatus W→PK（離開撿貨清單、可包貨）
      if (fullyDone.length) await advanceSoItemsFulfill(tx, { tenantId, soItemIds: fullyDone, to: 'PK', userId: user.sub });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_pk_item',
        entityId: partId,
        entityCode: lines[0].partNo,
        summary: `撿取 ${lines[0].partNo} ×${pickedTotal}（${dto.qty != null ? '部分' : '全部'}）`,
      });
      return { picked: pickedTotal };
    });
  }

  // ── 異常回報（對剩餘量開單） ─────────────────────────────

  async reportPickIssue(user: RequestUser, dto: ReportPickIssueDto) {
    const tenantId = requireTenantId(user);
    const warehouseId = dto.warehouseId.trim();
    const partId = dto.partId.trim();
    const soIds = await this.prisma.$transaction(async (tx) => {
      const lines = await this.loadLineProgress(tx, tenantId, warehouseId, partId);
      const remainingLines = lines.filter((l) => l.qty - l.picked > 0);
      if (!remainingLines.length) throw new BadRequestException('此料件已無剩餘量可回報異常');
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const locId = await this.defaultLocationId(tx, tenantId, partId, warehouseId);
      const label = dto.issueType === 'D' ? '損毀' : '數量短缺';
      const reason = dto.reason?.trim() || `撿貨回報：${label}`;

      const done: string[] = [];
      const touchedSoIds = new Set<string>();
      for (const l of remainingLines) {
        const rem = l.qty - l.picked;
        const pk = await this.ensureHiddenPk(tx, user, tenantId, {
          id: l.soId,
          deliveryType: l.deliveryType,
          warehouseId,
          warehouseCode: wh.code,
        });
        await this.appendPkItem(tx, user, pk.id, partId, l, locId, rem, 'M', reason);
        if (pk.status === PkStatus.PENDING) {
          await tx.nx03Pk.update({
            where: { id: pk.id },
            data: { status: PkStatus.COUNTING, startedAt: new Date(), updatedBy: user.sub },
          });
        }
        touchedSoIds.add(l.soId);
        done.push(l.soItemId); // 帳平（已撿+異常=需求）
      }
      // 撿貨開始時間戳：異常回報也算撿貨動作、只寫一次
      await this.stampPickStarted(tx, user, [...touchedSoIds]);
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds: done, to: 'PK', userId: user.sub });
      return remainingLines;
    });

    // 對剩餘總量開一張正式異常回報單（接六處置流程）
    const totalRemaining = soIds.reduce((n, l) => n + (l.qty - l.picked), 0);
    const locId = await this.defaultLocationId(this.prisma, tenantId, partId, warehouseId);
    return this.issueReport.create(user, {
      reportDate: new Date().toISOString().slice(0, 10),
      warehouseId,
      partId,
      qty: totalRemaining,
      issueType: dto.issueType,
      locationId: locId ?? undefined,
      description: dto.reason?.trim() || undefined,
      sourceModule: 'NX03',
    });
  }

  // ── 重置數量（反寫已撿量） ───────────────────────────────

  async resetPick(user: RequestUser, dto: ResetPickDto) {
    const tenantId = requireTenantId(user);
    const warehouseId = dto.warehouseId.trim();
    const partId = dto.partId.trim();
    return this.prisma.$transaction(async (tx) => {
      // 取 (倉×料件) 在撿貨中/待撿、未包貨、未帶異常的行
      const lines = await tx.nx04SoItem.findMany({
        where: {
          warehouseId,
          partId,
          fulfillStatus: { in: ['W', 'PK'] },
          so: { tenantId, cancelledAt: null, status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] } },
        },
        select: { id: true },
      });
      const ids = lines.map((l) => l.id);
      if (!ids.length) throw new BadRequestException('沒有可重置的撿貨進度');
      // 該行的 C pk_item（未被包貨引用）；有 M 異常的行不重置
      const items = await tx.nx03PkItem.findMany({
        where: { refSoItemId: { in: ids }, pk: { tenantId } },
        select: { id: true, refSoItemId: true, status: true, qty: true, rev_Nx03PlItem_pkItemId: { select: { id: true } } },
      });
      const hasIssue = new Set(items.filter((i) => i.status === 'M').map((i) => i.refSoItemId));
      const delIds: string[] = [];
      const resetLines = new Set<string>();
      let resetQty = 0;
      for (const it of items) {
        if (it.status !== 'C') continue;
        if (it.rev_Nx03PlItem_pkItemId.length > 0) continue; // 已包貨、不重置
        if (hasIssue.has(it.refSoItemId!)) continue; // 該行有異常、不重置
        delIds.push(it.id);
        resetQty += Number(it.qty);
        if (it.refSoItemId) resetLines.add(it.refSoItemId);
      }
      if (!delIds.length) throw new BadRequestException('沒有可重置的已撿量（可能已包貨或已回報異常）');
      await tx.nx03PkItem.deleteMany({ where: { id: { in: delIds } } });
      // WMS P2：取消撿貨＝把貨從待包暫存搬回原儲位（誤按修正、貨歸位好重撿）
      await moveLocationBalance(tx, {
        tenantId, partId, warehouseId,
        fromLocationId: await resolveSystemBin(tx, tenantId, warehouseId, SystemBinType.PACK_STAGING),
        toLocationId: await resolveStorageBin(tx, tenantId, partId, warehouseId),
        qty: resetQty, userId: user.sub,
      });
      // 這些行回到待撿 W
      await tx.nx04SoItem.updateMany({ where: { id: { in: [...resetLines] } }, data: { fulfillStatus: 'W', updatedBy: user.sub } });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_pk_item',
        entityId: partId,
        entityCode: partId,
        summary: `重置撿貨數量（${resetLines.size} 行歸零）`,
      });
      return { reset: resetLines.size };
    });
  }

  // ── 中欄「已撿貨」／右欄「已取消」清單（WMS P2、依單號/客戶分組） ──────────

  /** 中欄：已撿完待包的貨（撿貨中→待包暫存 K、SO 未取消、未進包貨）。 */
  async getPickedList(user: RequestUser, q: StagedListQueryDto) {
    const tenantId = requireTenantId(user);
    return this.stagedList(tenantId, q, {
      pk: { tenantId, status: { not: PkStatus.VOIDED } },
      refSoItem: { fulfillStatus: 'PK' },
      refSo: { cancelledAt: null },
    });
  }

  /** 右欄：訂單被取消、貨已撿待放回（在待上架 B、隱形撿貨單已作廢）。 */
  async getCancelledList(user: RequestUser, q: StagedListQueryDto) {
    const tenantId = requireTenantId(user);
    return this.stagedList(tenantId, q, {
      pk: { tenantId, status: PkStatus.VOIDED },
      refSo: { cancelledAt: { not: null } },
    });
  }

  /** 中/右欄共用：撈 C 撿貨明細、依「單號」分組、同單同料件合併數量。 */
  private async stagedList(tenantId: string, q: StagedListQueryDto, extra: Prisma.Nx03PkItemWhereInput) {
    const where: Prisma.Nx03PkItemWhereInput = {
      status: 'C',
      refSoId: { not: null },
      rev_Nx03PlItem_pkItemId: { none: {} }, // 未進包貨
      ...extra,
    };
    if (q.warehouseId?.trim()) where.pk = { ...(where.pk as object), warehouseId: q.warehouseId.trim() };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { refSo: { is: { docNo: { contains: s, mode: 'insensitive' } } } },
        { refSo: { is: { customer: { name: { contains: s, mode: 'insensitive' } } } } },
      ];
    }
    const rows = await this.prisma.nx03PkItem.findMany({
      where,
      orderBy: [{ refSoId: 'asc' }, { lineNo: 'asc' }],
      select: {
        partId: true, partNo: true, partName: true, qty: true,
        refSoId: true,
        pk: { select: { warehouseId: true, warehouse: { select: { code: true } } } },
        refSo: { select: { docNo: true, customerId: true, customer: { select: { name: true } } } },
      },
    });

    // 料件原儲位（供「依庫位」分組；同 stagedList 只掛顯示、不影響動作）
    const partWh = [...new Set(rows.map((r) => `${r.partId}|${r.pk?.warehouseId ?? ''}`))];
    const settings = await this.prisma.nx03PartStockSetting.findMany({
      where: { tenantId, OR: partWh.map((k) => ({ partId: k.split('|')[0], warehouseId: k.split('|')[1] })) },
      select: { partId: true, warehouseId: true, defaultLocationId: true },
    });
    const locIds = [...new Set(settings.map((s) => s.defaultLocationId).filter((x): x is string => !!x))];
    const locCode = new Map((locIds.length ? await this.prisma.nx01Location.findMany({ where: { id: { in: locIds } }, select: { id: true, code: true } }) : []).map((l) => [l.id, l.code]));
    const locByKey = new Map(settings.map((s) => [`${s.partId}|${s.warehouseId}`, s.defaultLocationId ? (locCode.get(s.defaultLocationId) ?? null) : null]));

    const byLocation = q.groupBy === 'location';
    interface StagedItem { soId: string; soDocNo: string; customerName: string; partId: string; partNo: string; partName: string; qty: number; warehouseId: string; locationCode: string | null }
    interface StagedGroup { title: string; items: StagedItem[]; _byKey: Map<string, StagedItem> }
    const groups = new Map<string, StagedGroup>();
    for (const r of rows) {
      const so = r.refSo;
      if (!r.refSoId || !so) continue;
      const whId = r.pk?.warehouseId ?? '';
      const custName = so.customer?.name ?? '—';
      const locCodeVal = locByKey.get(`${r.partId}|${whId}`) ?? null;
      const gk = byLocation ? (locCodeVal ?? '未指定庫位') : custName;
      let g = groups.get(gk);
      if (!g) { g = { title: gk, items: [], _byKey: new Map() }; groups.set(gk, g); }
      // 同組內合併同（單×料件）
      const ik = `${r.refSoId}|${r.partId}`;
      let it = g._byKey.get(ik);
      if (!it) {
        it = { soId: r.refSoId, soDocNo: so.docNo, customerName: custName, partId: r.partId, partNo: r.partNo, partName: r.partName, qty: 0, warehouseId: whId, locationCode: locCodeVal };
        g._byKey.set(ik, it); g.items.push(it);
      }
      it.qty += Number(r.qty);
    }
    const groupList = [...groups.values()]
      .map(({ _byKey, ...g }) => ({ ...g, lineCount: g.items.length }))
      .sort((a, b) => a.title.localeCompare(b.title));
    return { groups: groupList, total: groupList.reduce((n, g) => n + g.items.length, 0) };
  }

  // ── 中欄「取消撿貨」：誤按已撿貨、貨其實還沒撿 → 退回左邊待撿（待包 K→原儲位） ──────

  async cancelPickedLine(user: RequestUser, dto: StagedActionDto) {
    const tenantId = requireTenantId(user);
    const { soId, partId, warehouseId } = { soId: dto.soId.trim(), partId: dto.partId.trim(), warehouseId: dto.warehouseId.trim() };
    return this.prisma.$transaction(async (tx) => {
      const items = await tx.nx03PkItem.findMany({
        where: {
          status: 'C', refSoId: soId, partId,
          pk: { tenantId, status: { not: PkStatus.VOIDED }, warehouseId },
          rev_Nx03PlItem_pkItemId: { none: {} },
          refSo: { cancelledAt: null },
        },
        select: { id: true, refSoItemId: true, qty: true },
      });
      if (!items.length) throw new BadRequestException('沒有可取消的已撿貨（可能已包貨或狀態已變）');
      const qty = items.reduce((n, i) => n + Number(i.qty), 0);
      const lineIds = [...new Set(items.map((i) => i.refSoItemId).filter((x): x is string => !!x))];
      await tx.nx03PkItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
      // 待包暫存 → 原儲位（貨歸位、好重撿）
      await moveLocationBalance(tx, {
        tenantId, partId, warehouseId,
        fromLocationId: await resolveSystemBin(tx, tenantId, warehouseId, SystemBinType.PACK_STAGING),
        toLocationId: await resolveStorageBin(tx, tenantId, partId, warehouseId),
        qty, userId: user.sub,
      });
      // 該行回待撿 W
      if (lineIds.length) await tx.nx04SoItem.updateMany({ where: { id: { in: lineIds } }, data: { fulfillStatus: 'W', updatedBy: user.sub } });
      await this.audit.write({
        tenantId, actorUserId: user.sub, moduleCode: 'NX03', action: 'UPDATE',
        entityTable: 'nx03_pk_item', entityId: partId, entityCode: partId,
        summary: `取消撿貨（誤按修正、${lineIds.length} 行退回待撿）`,
      });
      return { cancelled: lineIds.length, qty };
    });
  }

  // ── 右欄「已放回」：訂單取消、貨已撿 → 確認搬回架上（待上架 B→原儲位、結束右欄項） ──────

  async putBack(user: RequestUser, dto: StagedActionDto) {
    const tenantId = requireTenantId(user);
    const { soId, partId, warehouseId } = { soId: dto.soId.trim(), partId: dto.partId.trim(), warehouseId: dto.warehouseId.trim() };
    return this.prisma.$transaction(async (tx) => {
      const items = await tx.nx03PkItem.findMany({
        where: {
          status: 'C', refSoId: soId, partId,
          pk: { tenantId, status: PkStatus.VOIDED, warehouseId },
          rev_Nx03PlItem_pkItemId: { none: {} },
          refSo: { cancelledAt: { not: null } },
        },
        select: { id: true, qty: true },
      });
      if (!items.length) throw new BadRequestException('沒有可放回的貨（可能已放回）');
      const qty = items.reduce((n, i) => n + Number(i.qty), 0);
      // 待上架 → 原儲位（真的回架上）
      await moveLocationBalance(tx, {
        tenantId, partId, warehouseId,
        fromLocationId: await resolveSystemBin(tx, tenantId, warehouseId, SystemBinType.PUTBACK_PENDING),
        toLocationId: await resolveStorageBin(tx, tenantId, partId, warehouseId),
        qty, userId: user.sub,
      });
      await tx.nx03PkItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
      await this.audit.write({
        tenantId, actorUserId: user.sub, moduleCode: 'NX03', action: 'UPDATE',
        entityTable: 'nx03_pk_item', entityId: partId, entityCode: partId,
        summary: `已放回（訂單取消、${qty} 個搬回原儲位）`,
      });
      return { putBack: items.length, qty };
    });
  }

  // ── 中/右欄「異常回報」：對已撿/待放回貨開異常回報單（接六處置）＋移出本區 ──────

  async reportStagedIssue(user: RequestUser, dto: StagedIssueDto) {
    const tenantId = requireTenantId(user);
    const { soId, partId, warehouseId } = { soId: dto.soId.trim(), partId: dto.partId.trim(), warehouseId: dto.warehouseId.trim() };
    const { qty, cancelled } = await this.prisma.$transaction(async (tx) => {
      const so = await tx.nx04So.findFirst({ where: { id: soId, tenantId }, select: { cancelledAt: true } });
      const isCancelled = !!so?.cancelledAt;
      const items = await tx.nx03PkItem.findMany({
        where: {
          status: 'C', refSoId: soId, partId,
          pk: { tenantId, warehouseId, status: isCancelled ? PkStatus.VOIDED : { not: PkStatus.VOIDED } },
          rev_Nx03PlItem_pkItemId: { none: {} },
        },
        select: { id: true, refSoItemId: true, qty: true },
      });
      if (!items.length) throw new BadRequestException('沒有可回報異常的貨');
      const q = items.reduce((n, i) => n + Number(i.qty), 0);
      const lineIds = [...new Set(items.map((i) => i.refSoItemId).filter((x): x is string => !!x))];
      // 目前所在暫存格（中=待包 K / 右=待上架 B）→ 原儲位（交六處置從架上處置）
      await moveLocationBalance(tx, {
        tenantId, partId, warehouseId,
        fromLocationId: await resolveSystemBin(tx, tenantId, warehouseId, isCancelled ? SystemBinType.PUTBACK_PENDING : SystemBinType.PACK_STAGING),
        toLocationId: await resolveStorageBin(tx, tenantId, partId, warehouseId),
        qty: q, userId: user.sub,
      });
      await tx.nx03PkItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
      // 未取消單的行退回待撿（好重撿良品）
      if (!isCancelled && lineIds.length) await tx.nx04SoItem.updateMany({ where: { id: { in: lineIds } }, data: { fulfillStatus: 'W', updatedBy: user.sub } });
      return { qty: q, cancelled: isCancelled };
    });
    const locId = await this.defaultLocationId(this.prisma, tenantId, partId, warehouseId);
    await this.issueReport.create(user, {
      reportDate: new Date().toISOString().slice(0, 10),
      warehouseId, partId, qty,
      issueType: dto.issueType,
      locationId: locId ?? undefined,
      description: dto.reason?.trim() || `${cancelled ? '待放回' : '已撿'}貨異常回報`,
      sourceModule: 'NX03',
    });
    return { reported: true, qty };
  }

  // ── 內部 helpers ─────────────────────────────────────────

  /**
   * 撿貨開始時間戳（單據計時 KPI 起點）：把觸及的 SO 蓋 pick_started_at。
   * 只在 null 時寫（updateMany where pick_started_at=null）＝第一次撿貨動作只寫一次、之後不動。
   */
  private async stampPickStarted(tx: Prisma.TransactionClient, user: RequestUser, soIds: string[]): Promise<void> {
    if (!soIds.length) return;
    await tx.nx04So.updateMany({
      where: { id: { in: soIds }, pickStartedAt: null },
      data: { pickStartedAt: new Date(), updatedBy: user.sub },
    });
  }

  /** 每行已撿量（C pk_items 加總）。 */
  private async pickedQtyByLine(
    db: PrismaService | Prisma.TransactionClient,
    soItemIds: string[],
  ): Promise<Map<string, number>> {
    if (!soItemIds.length) return new Map();
    const grouped = await db.nx03PkItem.groupBy({
      by: ['refSoItemId'],
      where: { refSoItemId: { in: soItemIds }, status: 'C' },
      _sum: { qty: true },
    });
    const m = new Map<string, number>();
    for (const g of grouped) if (g.refSoItemId) m.set(g.refSoItemId, Number(g._sum.qty ?? 0));
    return m;
  }

  /** 載入 (倉×料件) 待撿行的撿貨進度（qty / 已撿）。 */
  private async loadLineProgress(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    partId: string,
  ): Promise<LineProgress[]> {
    const lines = await tx.nx04SoItem.findMany({
      where: {
        warehouseId,
        partId,
        transferStatus: 'C',
        fulfillStatus: 'W',
        so: { tenantId, cancelledAt: null, status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] } },
      },
      orderBy: { soId: 'asc' }, // FIFO 分配
      select: { id: true, soId: true, partNo: true, partName: true, qty: true, so: { select: { deliveryType: true, status: true } } },
    });
    if (!lines.length) return [];
    const picked = await this.pickedQtyByLine(tx, lines.map((l) => l.id));
    return lines.map((l) => ({
      soItemId: l.id,
      soId: l.soId,
      deliveryType: l.so.deliveryType,
      soStatus: l.so.status,
      partNo: l.partNo,
      partName: l.partName,
      qty: Number(l.qty),
      picked: picked.get(l.id) ?? 0,
    }));
  }

  private async defaultLocationId(
    db: PrismaService | Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    warehouseId: string,
  ): Promise<string | null> {
    const s = await db.nx03PartStockSetting.findFirst({
      where: { tenantId, partId, warehouseId },
      select: { defaultLocationId: true },
    });
    return s?.defaultLocationId ?? null;
  }

  private async appendPkItem(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    pkId: string,
    partId: string,
    l: LineProgress,
    locationId: string | null,
    qty: number,
    status: 'C' | 'M',
    notFoundReason?: string,
  ) {
    const maxLine = await tx.nx03PkItem.aggregate({ where: { pkId }, _max: { lineNo: true } });
    await tx.nx03PkItem.create({
      data: {
        pkId,
        refSoId: l.soId,
        refSoItemId: l.soItemId,
        lineNo: (maxLine._max.lineNo ?? 0) + 1,
        partId,
        partNo: l.partNo,
        partName: l.partName,
        locationId,
        qty: new PrismaNs.Decimal(qty),
        status,
        notFoundReason: notFoundReason ?? null,
        labelChecked: false,
        updatedBy: user.sub,
      },
    });
  }

  private async ensureHiddenPk(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    so: { id: string; deliveryType: string; warehouseId: string; warehouseCode: string },
  ): Promise<{ id: string; status: string }> {
    const found = await tx.nx03Pk.findFirst({
      where: {
        tenantId,
        warehouseId: so.warehouseId,
        triggerSource: 'S',
        status: { in: [PkStatus.PENDING, PkStatus.COUNTING] },
        rev_Nx03PkItem_pkId: { some: { refSoId: so.id } },
      },
      select: { id: true, status: true },
    });
    if (found) return found;
    const docNo = await allocNx03DocNo(tx, tenantId, 'PK', so.warehouseCode);
    return tx.nx03Pk.create({
      data: {
        tenantId,
        warehouseId: so.warehouseId,
        docNo,
        pkDate: new Date(),
        triggerSource: 'S',
        deliveryType: so.deliveryType,
        status: PkStatus.PENDING,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true, status: true },
    });
  }
}
