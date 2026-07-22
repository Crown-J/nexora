// apps/nx-api/src/nx03/pick-pool/pick-pool.service.ts
// 撿貨清單 service（SALES-FLOW 撿貨重設計 2026-07-22 執行長拍板）
//
// 業務語意：撿貨以「庫位」為軸、不是銷貨單——倉管不管貨是誰的哪張單，
//   只照庫位順路一路撿到包貨區。清單＝依庫位分組、同（倉×料件）合併總量的撿貨任務列。
//   每列快速反應：這東西在哪(庫位) / 長什麼樣(主圖) / 異常(開異常回報單) / 撿好了。
//
// 底層：撿到了＝把該（倉×料件）所有待撿的 SO 行整批落 nx03_pk_item(status=C)、推進 fulfillStatus W→PK；
//   一 SO 一張隱形撿貨單當接往包貨的橋（倉管無感）。撿貨不扣帳（扣庫存/開應收依 D4/D6 移到簽收）。

import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { advanceSoItemsFulfill } from '../../shared/nx03/nx03-fulfill-advance';
import { PkStatus } from '../../shared/nx03/nx03-state-machine';
import { SoStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { IssueReportService } from '../issue-report/issue-report.service';

import type { PickAggregateDto, PickListQueryDto, ReportPickIssueDto } from './dto/pick-pool.dto';

/** 撿貨任務列（同 倉×料件 合併總量）。 */
interface PickItem {
  warehouseId: string;
  warehouseCode: string;
  partId: string;
  partNo: string;
  partName: string;
  photoId: string | null; // 料件主圖（nx01_part_photo）
  locationId: string | null;
  locationCode: string | null;
  totalQty: string;
  soDocNos: string[]; // 底層來自哪些銷貨單（倉管不需管、備查）
  soItemIds: string[];
}

/** 依庫位分組。 */
interface PickGroup {
  locationId: string | null;
  locationCode: string | null; // null=未指定庫位
  warehouseCode: string;
  items: PickItem[];
}

@Injectable()
export class PickPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly issueReport: IssueReportService,
  ) {}

  /** 撿貨清單：待撿行依庫位分組、同（倉×料件）合併總量、排序＝走動最優化。 */
  async getPickList(user: RequestUser, q: PickListQueryDto): Promise<{ groups: PickGroup[]; total: number; lineCount: number }> {
    const tenantId = requireTenantId(user);
    const where: Prisma.Nx04SoItemWhereInput = {
      transferStatus: 'C',
      fulfillStatus: 'W', // 待撿（已撿的推進到 PK、離開清單）
      so: { tenantId, cancelledAt: null, status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] } },
    };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.nx04SoItem.findMany({
      where,
      select: {
        id: true,
        warehouseId: true,
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        so: { select: { docNo: true } },
      },
    });
    if (!rows.length) return { groups: [], total: 0, lineCount: 0 };

    const partIds = [...new Set(rows.map((r) => r.partId))];
    const whIds = [...new Set(rows.map((r) => r.warehouseId))];

    // 庫位（part_stock_setting.defaultLocationId per 倉×料件）
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

    // 主圖（sortNo 最小 = 主圖）
    const photos = await this.prisma.nx01PartPhoto.findMany({
      where: { partId: { in: partIds } },
      orderBy: { sortNo: 'asc' },
      select: { id: true, partId: true },
    });
    const photoByPart = new Map<string, string>();
    for (const p of photos) if (!photoByPart.has(p.partId)) photoByPart.set(p.partId, p.id);

    // 合併：倉×料件
    const agg = new Map<string, PickItem & { _qty: number; _docNos: Set<string> }>();
    for (const r of rows) {
      const key = `${r.warehouseId}|${r.partId}`;
      let a = agg.get(key);
      if (!a) {
        const locId = locByKey.get(key) ?? null;
        a = {
          warehouseId: r.warehouseId,
          warehouseCode: whCode.get(r.warehouseId) ?? '',
          partId: r.partId,
          partNo: r.partNo,
          partName: r.partName,
          photoId: photoByPart.get(r.partId) ?? null,
          locationId: locId,
          locationCode: locId ? (locCode.get(locId) ?? null) : null,
          totalQty: '0',
          soDocNos: [],
          soItemIds: [],
          _qty: 0,
          _docNos: new Set<string>(),
        };
        agg.set(key, a);
      }
      a._qty += Number(r.qty);
      a.soItemIds.push(r.id);
      if (r.so?.docNo) a._docNos.add(r.so.docNo);
    }

    const items: PickItem[] = [...agg.values()].map((a) => ({
      warehouseId: a.warehouseId,
      warehouseCode: a.warehouseCode,
      partId: a.partId,
      partNo: a.partNo,
      partName: a.partName,
      photoId: a.photoId,
      locationId: a.locationId,
      locationCode: a.locationCode,
      totalQty: String(a._qty),
      soDocNos: [...a._docNos],
      soItemIds: a.soItemIds,
    }));

    // 排序：庫位碼（未指定排最後）→ 料號
    const locKeyOf = (c: string | null) => (c == null ? '￿' : c);
    items.sort((x, y) => locKeyOf(x.locationCode).localeCompare(locKeyOf(y.locationCode)) || x.partNo.localeCompare(y.partNo));

    // 依庫位分組
    const groups = new Map<string, PickGroup>();
    for (const it of items) {
      const gk = it.locationId ?? '__none__';
      let g = groups.get(gk);
      if (!g) {
        g = { locationId: it.locationId, locationCode: it.locationCode, warehouseCode: it.warehouseCode, items: [] };
        groups.set(gk, g);
      }
      g.items.push(it);
    }
    const groupList = [...groups.values()].sort((a, b) => locKeyOf(a.locationCode).localeCompare(locKeyOf(b.locationCode)));
    return { groups: groupList, total: items.length, lineCount: rows.length };
  }

  /** 撿到了：把某（倉×料件）的所有待撿行整批標為已撿（落 pk_item、推進 W→PK）。 */
  async pickAggregate(user: RequestUser, dto: PickAggregateDto) {
    const tenantId = requireTenantId(user);
    const warehouseId = dto.warehouseId.trim();
    const partId = dto.partId.trim();
    return this.prisma.$transaction(async (tx) => {
      const lines = await tx.nx04SoItem.findMany({
        where: {
          warehouseId,
          partId,
          transferStatus: 'C',
          fulfillStatus: 'W',
          so: { tenantId, cancelledAt: null, status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] } },
        },
        select: {
          id: true,
          soId: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          so: { select: { id: true, deliveryType: true, status: true } },
        },
      });
      if (!lines.length) {
        throw new BadRequestException('目前沒有可撿的待撿項（可能已撿或單據已取消）');
      }
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const setting = await tx.nx03PartStockSetting.findFirst({
        where: { tenantId, partId, warehouseId },
        select: { defaultLocationId: true },
      });
      const locId = setting?.defaultLocationId ?? null;

      // 依 SO 分組落 pk_item
      const bySo = new Map<string, typeof lines>();
      for (const l of lines) {
        const arr = bySo.get(l.soId) ?? [];
        arr.push(l);
        bySo.set(l.soId, arr);
      }
      for (const [soId, soLines] of bySo) {
        const so = soLines[0].so;
        const pk = await this.ensureHiddenPk(tx, user, tenantId, {
          id: soId,
          deliveryType: so.deliveryType,
          warehouseId,
          warehouseCode: wh.code,
        });
        const maxLine = await tx.nx03PkItem.aggregate({ where: { pkId: pk.id }, _max: { lineNo: true } });
        let line = (maxLine._max.lineNo ?? 0) + 1;
        for (const l of soLines) {
          await tx.nx03PkItem.create({
            data: {
              pkId: pk.id,
              refSoId: soId,
              refSoItemId: l.id,
              lineNo: line++,
              partId: l.partId,
              partNo: l.partNo,
              partName: l.partName,
              locationId: locId,
              qty: l.qty,
              status: 'C', // 撿到了＝已撿完
              labelChecked: false,
              updatedBy: user.sub,
            },
          });
        }
        // 隱形 PK：P→C（啟動）→ 全數非 P 時 C→F（供包貨撈貨）
        if (pk.status === PkStatus.PENDING) {
          await tx.nx03Pk.update({
            where: { id: pk.id },
            data: { status: PkStatus.COUNTING, startedAt: new Date(), updatedBy: user.sub },
          });
        }
        const pending = await tx.nx03PkItem.count({ where: { pkId: pk.id, status: 'P' } });
        if (pending === 0) {
          await tx.nx03Pk.update({
            where: { id: pk.id },
            data: { status: PkStatus.FINISHED, completedAt: new Date(), completedBy: user.sub, updatedBy: user.sub },
          });
        }
        // SO CONFIRMED→PICKING（撿貨啟動）
        if (so.status === SoStatus.CONFIRMED) {
          await tx.nx04So.update({ where: { id: soId }, data: { status: SoStatus.PICKING, updatedBy: user.sub } });
        }
      }
      // 推進 fulfillStatus W→PK
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds: lines.map((l) => l.id), to: 'PK', userId: user.sub });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_pk_item',
        entityId: partId,
        entityCode: lines[0].partNo,
        summary: `撿貨完成（${lines[0].partNo}、${bySo.size} 張單 / ${lines.length} 行）`,
      });
      return { picked: lines.length, soCount: bySo.size };
    });
  }

  /** 撿貨異常：開正式異常回報單（損毀 D / 數量短缺 S），接六處置流程。 */
  async reportPickIssue(user: RequestUser, dto: ReportPickIssueDto) {
    const tenantId = requireTenantId(user);
    const setting = await this.prisma.nx03PartStockSetting.findFirst({
      where: { tenantId, partId: dto.partId.trim(), warehouseId: dto.warehouseId.trim() },
      select: { defaultLocationId: true },
    });
    return this.issueReport.create(user, {
      reportDate: new Date().toISOString().slice(0, 10),
      warehouseId: dto.warehouseId.trim(),
      partId: dto.partId.trim(),
      qty: dto.qty,
      issueType: dto.issueType,
      locationId: setting?.defaultLocationId ?? undefined,
      description: dto.reason?.trim() || undefined,
      sourceModule: 'NX03',
    });
  }

  /** 找/開該 SO 的隱形撿貨單（未完成 P/C）。 */
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
