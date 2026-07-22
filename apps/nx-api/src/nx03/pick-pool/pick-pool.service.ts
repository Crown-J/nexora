// apps/nx-api/src/nx03/pick-pool/pick-pool.service.ts
// 撿貨池 service（SALES-FLOW 階段 1、2026-07-22 執行長拍板 D1）
//
// 業務語意：撿貨「表頭拆掉」＝倉管眼前只有一張工作池清單、不新增撿貨單。
//   池 = 所有「現貨已備齊、還沒撿完」的銷貨行（transferStatus=C 且 fulfillStatus∈{W,PK}）。
//   每行狀態：待撿(W) → 撿貨中(K) → 已撿完(D)／找不到(M)。
//
// 底層：nx03_pk 撿貨單降為「隱形帳」——系統自動每張 SO 開一張隱形撿貨單當接往包貨的橋，
//   倉管無感。一張 SO 對應一張未完成(P/C)的隱形 PK；deliveryType 取自 SO 表頭（header 語意仍合法）。
//   撿貨動作全部落在既有 nx03_pk / nx03_pk_item + 既有 fulfill-advance helper 上、零 schema 改動。
//
// 過帳：撿貨不扣帳（扣庫存/開應收依 D4/D6 移到簽收）；此處只推進 fulfillStatus W→PK。

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { advanceSoItemsFulfill } from '../../shared/nx03/nx03-fulfill-advance';
import { PkStatus } from '../../shared/nx03/nx03-state-machine';
import { SoStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { NotFoundLineDto, PickLineDto, PickPoolQueryDto, StartPickDto } from './dto/pick-pool.dto';

/** 池行狀態（前端顯示用；非 DB 欄位、由 fulfillStatus + pk_item.status 推導）。 */
type PoolLineStatus = 'W' | 'K' | 'D' | 'M'; // 待撿 / 撿貨中 / 已撿完 / 找不到

interface PoolLine {
  soItemId: string;
  soId: string;
  soDocNo: string;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  deliveryType: string; // D=配送 / P=自取 / C=寄貨
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  locationId: string | null;
  status: PoolLineStatus;
  pkItemId: string | null;
}

/** 撿貨池：以 SO 為群組回傳（一張 SO 一疊行）。 */
interface PoolGroup {
  soId: string;
  soDocNo: string;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  deliveryType: string;
  soDate: string | null;
  lines: PoolLine[];
  pendingCount: number; // 待撿
  pickingCount: number; // 撿貨中
  doneCount: number; // 已撿完 + 找不到
}

@Injectable()
export class PickPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 撿貨池清單（依 SO 群組）。 */
  async getPool(user: RequestUser, q: PickPoolQueryDto): Promise<{ groups: PoolGroup[]; total: number }> {
    const tenantId = requireTenantId(user);
    const soWhere: Prisma.Nx04SoWhereInput = {
      tenantId,
      cancelledAt: null,
      status: { in: [SoStatus.CONFIRMED, SoStatus.PICKING] },
    };
    if (q.warehouseId?.trim()) soWhere.warehouseId = q.warehouseId.trim();

    const where: Prisma.Nx04SoItemWhereInput = {
      transferStatus: 'C', // 補貨完成＝現貨備妥（本倉現貨 or 調撥/調貨已到）
      fulfillStatus: { in: ['W', 'PK'] }, // 待撿 or 撿貨中（PL 之後已離開撿貨池）
      so: soWhere,
    };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { so: { docNo: { contains: s, mode: 'insensitive' } } },
        { so: { customer: { name: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.nx04SoItem.findMany({
      where,
      orderBy: [{ soId: 'asc' }, { lineNo: 'asc' }],
      select: {
        id: true,
        soId: true,
        lineNo: true,
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        fulfillStatus: true,
        so: {
          select: {
            docNo: true,
            deliveryType: true,
            soDate: true,
            warehouseId: true,
            warehouse: { select: { code: true, name: true } },
            customer: { select: { name: true } },
          },
        },
      },
    });

    // 撈對應隱形撿貨單明細（非作廢 PK）→ 推導池行狀態
    const soItemIds = rows.map((r) => r.id);
    const pkItems = soItemIds.length
      ? await this.prisma.nx03PkItem.findMany({
          where: { refSoItemId: { in: soItemIds }, pk: { status: { not: PkStatus.VOIDED } } },
          select: { id: true, refSoItemId: true, status: true, locationId: true },
        })
      : [];
    const pkBySoItem = new Map(pkItems.map((pi) => [pi.refSoItemId!, pi]));

    const groups = new Map<string, PoolGroup>();
    for (const r of rows) {
      const pi = pkBySoItem.get(r.id);
      const status = this.deriveStatus(r.fulfillStatus, pi?.status);
      if (q.status && status !== q.status) continue;
      let g = groups.get(r.soId);
      if (!g) {
        g = {
          soId: r.soId,
          soDocNo: r.so.docNo,
          customerName: r.so.customer?.name ?? '—',
          warehouseId: r.so.warehouseId,
          warehouseCode: r.so.warehouse?.code ?? '',
          warehouseName: r.so.warehouse?.name ?? '',
          deliveryType: r.so.deliveryType,
          soDate: r.so.soDate ? r.so.soDate.toISOString().slice(0, 10) : null,
          lines: [],
          pendingCount: 0,
          pickingCount: 0,
          doneCount: 0,
        };
        groups.set(r.soId, g);
      }
      g.lines.push({
        soItemId: r.id,
        soId: r.soId,
        soDocNo: r.so.docNo,
        customerName: r.so.customer?.name ?? '—',
        warehouseId: r.so.warehouseId,
        warehouseCode: r.so.warehouse?.code ?? '',
        warehouseName: r.so.warehouse?.name ?? '',
        deliveryType: r.so.deliveryType,
        lineNo: r.lineNo,
        partId: r.partId,
        partNo: r.partNo,
        partName: r.partName,
        qty: r.qty.toString(),
        locationId: pi?.locationId ?? null,
        status,
        pkItemId: pi?.id ?? null,
      });
      if (status === 'W') g.pendingCount++;
      else if (status === 'K') g.pickingCount++;
      else g.doneCount++;
    }

    const groupList = [...groups.values()].filter((g) => g.lines.length > 0);
    return { groups: groupList, total: groupList.reduce((n, g) => n + g.lines.length, 0) };
  }

  private deriveStatus(fulfillStatus: string, pkItemStatus?: string): PoolLineStatus {
    if (pkItemStatus === 'C') return 'D'; // 已撿完
    if (pkItemStatus === 'M') return 'M'; // 找不到
    if (pkItemStatus === 'P' || fulfillStatus === 'PK') return 'K'; // 撿貨中
    return 'W'; // 待撿
  }

  /**
   * 開始撿一張 SO：把其備妥待撿行整批進「撿貨中」。
   * - 找/開該 SO 的隱形撿貨單（未完成 P/C）；沒有就開一張（deliveryType 取自 SO）。
   * - 尚無 pk_item 的待撿行 → 新增 pk_item（status=P）。
   * - 隱形 PK P→C（推進行 fulfillStatus W→PK）；SO CONFIRMED→PICKING。
   */
  async startPick(user: RequestUser, dto: StartPickDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const so = await tx.nx04So.findFirst({
        where: { id: dto.soId.trim(), tenantId, cancelledAt: null },
        select: {
          id: true,
          docNo: true,
          status: true,
          deliveryType: true,
          warehouseId: true,
          warehouse: { select: { code: true } },
        },
      });
      if (!so) throw new NotFoundException('SO not found');
      if (so.status !== SoStatus.CONFIRMED && so.status !== SoStatus.PICKING) {
        throw new BadRequestException(`SO 狀態 ${so.status} 不可撿貨（需 CONFIRMED / PICKING）`);
      }

      // 備妥待撿行（現貨、還沒進撿貨中）
      const readyLines = await tx.nx04SoItem.findMany({
        where: { soId: so.id, transferStatus: 'C', fulfillStatus: 'W' },
        orderBy: { lineNo: 'asc' },
        select: { id: true, partId: true, partNo: true, partName: true, qty: true },
      });
      if (!readyLines.length) {
        throw new BadRequestException('此銷貨單目前沒有可撿的現貨行（可能待補貨或已在撿貨中）');
      }

      const pk = await this.ensureHiddenPk(tx, user, tenantId, so);

      // 已在此 PK 的行不重複加
      const existing = await tx.nx03PkItem.findMany({
        where: { pkId: pk.id, refSoItemId: { in: readyLines.map((l) => l.id) } },
        select: { refSoItemId: true },
      });
      const existingSet = new Set(existing.map((e) => e.refSoItemId));
      const maxLine = await tx.nx03PkItem.aggregate({ where: { pkId: pk.id }, _max: { lineNo: true } });
      let line = (maxLine._max.lineNo ?? 0) + 1;
      let added = 0;
      for (const l of readyLines) {
        if (existingSet.has(l.id)) continue;
        await tx.nx03PkItem.create({
          data: {
            pkId: pk.id,
            refSoId: so.id,
            refSoItemId: l.id,
            lineNo: line++,
            partId: l.partId,
            partNo: l.partNo,
            partName: l.partName,
            qty: l.qty,
            status: 'P',
            labelChecked: false,
            updatedBy: user.sub,
          },
        });
        added++;
      }

      // PK P→C（撿貨啟動）＋推進行 fulfillStatus W→PK
      if (pk.status === PkStatus.PENDING) {
        await tx.nx03Pk.update({
          where: { id: pk.id },
          data: { status: PkStatus.COUNTING, startedAt: new Date(), updatedBy: user.sub },
        });
      }
      await advanceSoItemsFulfill(tx, {
        tenantId,
        soItemIds: readyLines.map((l) => l.id),
        to: 'PK',
        userId: user.sub,
      });

      // SO CONFIRMED→PICKING（撿貨啟動、單據狀態同步）
      if (so.status === SoStatus.CONFIRMED) {
        await tx.nx04So.update({
          where: { id: so.id },
          data: { status: SoStatus.PICKING, updatedBy: user.sub },
        });
      }

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_pk',
        entityId: pk.id,
        entityCode: pk.docNo,
        summary: `開始撿貨（銷貨單 ${so.docNo}、${added} 行進撿貨中）`,
      });
      return { pkId: pk.id, pkDocNo: pk.docNo, soId: so.id, added };
    });
  }

  /** 標記某行「撿到了」＝已撿完（pk_item P→C）；全數非 P 時隱形 PK C→F。 */
  async pickLine(user: RequestUser, dto: PickLineDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const { pkItem, pk } = await this.loadActivePkItem(tx, tenantId, dto.soItemId.trim());
      let locationId = pkItem.locationId;
      if (dto.locationId?.trim()) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: dto.locationId.trim(), tenantId, warehouseId: pk.warehouseId },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId 必須屬於撿貨倉庫');
        locationId = loc.id;
      }
      await tx.nx03PkItem.update({
        where: { id: pkItem.id },
        data: { status: 'C', locationId, updatedBy: user.sub },
      });
      await this.autoFinishPk(tx, user, pk.id);
      return { ok: true };
    });
  }

  /** 標記某行「找不到貨」（pk_item →M、須原因）；全數非 P 時隱形 PK C→F。 */
  async notFoundLine(user: RequestUser, dto: NotFoundLineDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const { pkItem, pk } = await this.loadActivePkItem(tx, tenantId, dto.soItemId.trim());
      await tx.nx03PkItem.update({
        where: { id: pkItem.id },
        data: { status: 'M', notFoundReason: dto.reason.trim(), updatedBy: user.sub },
      });
      await this.autoFinishPk(tx, user, pk.id);
      return { ok: true };
    });
  }

  // ---- 內部 helpers ----

  /** 找/開該 SO 的隱形撿貨單（未完成 P/C）。 */
  private async ensureHiddenPk(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    so: { id: string; deliveryType: string; warehouseId: string; warehouse: { code: string } },
  ): Promise<{ id: string; docNo: string; status: string; warehouseId: string }> {
    const found = await tx.nx03Pk.findFirst({
      where: {
        tenantId,
        warehouseId: so.warehouseId,
        triggerSource: 'S',
        status: { in: [PkStatus.PENDING, PkStatus.COUNTING] },
        rev_Nx03PkItem_pkId: { some: { refSoId: so.id } },
      },
      select: { id: true, docNo: true, status: true, warehouseId: true },
    });
    if (found) return found;
    const docNo = await allocNx03DocNo(tx, tenantId, 'PK', so.warehouse.code);
    const created = await tx.nx03Pk.create({
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
      select: { id: true, docNo: true, status: true, warehouseId: true },
    });
    return created;
  }

  /** 由 soItemId 反查其進行中隱形撿貨單明細（撿貨中的行）。 */
  private async loadActivePkItem(tx: Prisma.TransactionClient, tenantId: string, soItemId: string) {
    const pkItem = await tx.nx03PkItem.findFirst({
      where: {
        refSoItemId: soItemId,
        pk: { tenantId, status: { in: [PkStatus.PENDING, PkStatus.COUNTING] } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        locationId: true,
        pk: { select: { id: true, warehouseId: true } },
      },
    });
    if (!pkItem) throw new BadRequestException('此行尚未開始撿貨（請先「開始撿貨」）');
    return { pkItem, pk: pkItem.pk };
  }

  /** 隱形撿貨單所有行都非「待撿(P)」→ 自動完成 C→F（供包貨撈貨）。 */
  private async autoFinishPk(tx: Prisma.TransactionClient, user: RequestUser, pkId: string) {
    const pending = await tx.nx03PkItem.count({ where: { pkId, status: 'P' } });
    if (pending > 0) return;
    const pk = await tx.nx03Pk.findUnique({ where: { id: pkId }, select: { status: true } });
    if (pk?.status !== PkStatus.COUNTING) return;
    await tx.nx03Pk.update({
      where: { id: pkId },
      data: { status: PkStatus.FINISHED, completedAt: new Date(), completedBy: user.sub, updatedBy: user.sub },
    });
  }
}
