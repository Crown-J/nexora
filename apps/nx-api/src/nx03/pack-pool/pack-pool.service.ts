// apps/nx-api/src/nx03/pack-pool/pack-pool.service.ts
// 包貨台 service（SALES-FLOW 階段 2、2026-07-22 執行長拍板 D2）
//
// 業務語意：撿貨池「已撿完」的貨進包貨台。以客戶為單位呈現：
//   同客戶的已撿完貨疊一起，預設「一箱一張銷貨單」（自動產包裹號 BX），
//   同客戶小件可 opt-in 併箱省包材（mergeParcels）。封箱＝包貨單 C→F。
//   一張包貨單只含一種出貨方式（D 配送 / P 自取 / C 寄貨）——因一箱只能進一個三區。
//
// 底層：一張包貨單(nx03_pl) 對一個客戶（customerId 快照）；跨多張 SO 時 pkId 留 null、
//   逐行靠 pl_item.pk_item_id 溯源。零扣帳（扣庫存/開應收依 D4/D6 留到階段 3 簽收）。

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { advanceSoItemsFulfill } from '../../shared/nx03/nx03-fulfill-advance';
import { PkStatus, PlStatus } from '../../shared/nx03/nx03-state-machine';
import { SoStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePackingDto, MergeParcelsDto, PackPoolQueryDto, SealPackingDto } from './dto/pack-pool.dto';

const DELIVERY_LABEL: Record<string, string> = { D: '配送', P: '自取', C: '寄貨' };

interface PackPoolLine {
  pkItemId: string;
  soId: string;
  soDocNo: string;
  soItemId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
}

/** 包貨台一組待包貨（同客戶 × 同出貨方式 × 同倉）。 */
interface PackPoolGroup {
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  deliveryType: string;
  deliveryLabel: string;
  soCount: number;
  lineCount: number;
  lines: PackPoolLine[];
}

@Injectable()
export class PackPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** BX 包裹號（BX-YYYYMM-倉碼-NNNNN、tenant + warehouseCode 範圍流水）。 */
  private async allocParcelNo(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseCode: string,
  ): Promise<string> {
    const y = new Date();
    const yyyymm = `${y.getFullYear()}${String(y.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `BX-${yyyymm}-${warehouseCode}-`;
    const last = await tx.nx03Parcel.findFirst({
      where: { tenantId, parcelNo: { startsWith: prefix } },
      orderBy: { parcelNo: 'desc' },
      select: { parcelNo: true },
    });
    let next = 1;
    if (last?.parcelNo) {
      const tail = last.parcelNo.split('-').pop() ?? '';
      const num = parseInt(tail, 10);
      if (!Number.isNaN(num)) next = num + 1;
    }
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  /**
   * 包貨台清單：已撿完但未包的行，依「客戶 × 出貨方式 × 倉」群組。
   * 來源＝pk_item.status='C'（已撿完）且對應 SO 行 fulfillStatus='PK'（尚未進包貨）。
   */
  async getPackPool(user: RequestUser, q: PackPoolQueryDto): Promise<{ groups: PackPoolGroup[]; total: number }> {
    const tenantId = requireTenantId(user);
    const pkWhere: Prisma.Nx03PkWhereInput = { tenantId, status: { not: PkStatus.VOIDED } };
    if (q.warehouseId?.trim()) pkWhere.warehouseId = q.warehouseId.trim();
    const where: Prisma.Nx03PkItemWhereInput = {
      status: 'C',
      refSoId: { not: null },
      pk: pkWhere,
      refSoItem: { fulfillStatus: 'PK' }, // 已撿完、還沒進包貨
      refSo: { cancelledAt: null }, // DOC-TIMING-KPI 2026-07-23：排除已取消 SO（對齊撿貨清單、防漏網）
    };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { refSo: { docNo: { contains: s, mode: 'insensitive' } } },
        { refSo: { customer: { name: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.nx03PkItem.findMany({
      where,
      orderBy: [{ refSoId: 'asc' }, { lineNo: 'asc' }],
      select: {
        id: true,
        refSoId: true,
        refSoItemId: true,
        lineNo: true,
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        refSo: {
          select: {
            docNo: true,
            deliveryType: true,
            customerId: true,
            warehouseId: true,
            warehouse: { select: { code: true, name: true } },
            customer: { select: { name: true } },
          },
        },
      },
    });

    // group key = customerId | deliveryType | warehouseId
    const groups = new Map<string, PackPoolGroup>();
    const soSeen = new Map<string, Set<string>>();
    for (const r of rows) {
      const so = r.refSo;
      if (!so || !so.customerId || !r.refSoItemId) continue;
      const key = `${so.customerId}|${so.deliveryType}|${so.warehouseId}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          customerId: so.customerId,
          customerName: so.customer?.name ?? '—',
          warehouseId: so.warehouseId,
          warehouseCode: so.warehouse?.code ?? '',
          warehouseName: so.warehouse?.name ?? '',
          deliveryType: so.deliveryType,
          deliveryLabel: DELIVERY_LABEL[so.deliveryType] ?? so.deliveryType,
          soCount: 0,
          lineCount: 0,
          lines: [],
        };
        groups.set(key, g);
        soSeen.set(key, new Set());
      }
      g.lines.push({
        pkItemId: r.id,
        soId: r.refSoId!,
        soDocNo: so.docNo,
        soItemId: r.refSoItemId,
        lineNo: r.lineNo,
        partId: r.partId,
        partNo: r.partNo,
        partName: r.partName,
        qty: r.qty.toString(),
      });
      g.lineCount++;
      soSeen.get(key)!.add(r.refSoId!);
    }
    for (const [key, g] of groups) g.soCount = soSeen.get(key)!.size;

    const groupList = [...groups.values()];
    return { groups: groupList, total: groupList.reduce((n, g) => n + g.lineCount, 0) };
  }

  /** 包貨中（已建、未封箱）清單：讓建了包貨單又離開的人能接續封箱（不會消失）。 */
  async listInProgress(user: RequestUser, q: PackPoolQueryDto) {
    const tenantId = requireTenantId(user);
    const where: Prisma.Nx03PlWhereInput = { tenantId, status: PlStatus.COUNTING };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    const rows = await this.prisma.nx03Pl.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, docNo: true, plType: true, createdAt: true,
        customer: { select: { name: true } },
        warehouse: { select: { code: true } },
        rev_Nx03Parcel_plId: { select: { id: true } },
        rev_Nx03PlItem_plId: { select: { id: true } },
      },
    });
    return {
      rows: rows.map((r) => ({
        id: r.id, docNo: r.docNo, plType: r.plType,
        customerName: r.customer?.name ?? '—', warehouseCode: r.warehouse?.code ?? '',
        parcelCount: r.rev_Nx03Parcel_plId.length, lineCount: r.rev_Nx03PlItem_plId.length,
        createdAt: r.createdAt,
      })),
      total: rows.length,
    };
  }

  /**
   * 建包貨單：把某客戶某出貨方式的已撿完待包行整批進一張包貨單。
   * 預設一箱一張銷貨單（每張 SO 自動產一個包裹 BX）；同客戶小件併箱另走 mergeParcels。
   */
  async createPacking(user: RequestUser, dto: CreatePackingDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');

      // 撈該客戶 × 出貨方式 × 倉 的已撿完待包行
      const pkItems = await tx.nx03PkItem.findMany({
        where: {
          status: 'C',
          refSoId: { not: null },
          pk: { tenantId, status: { not: PkStatus.VOIDED }, warehouseId: wh.id },
          refSoItem: { fulfillStatus: 'PK' },
          refSo: { customerId: dto.customerId.trim(), deliveryType: dto.deliveryType, cancelledAt: null },
        },
        orderBy: [{ refSoId: 'asc' }, { lineNo: 'asc' }],
        select: {
          id: true,
          refSoId: true,
          refSoItemId: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
        },
      });
      if (!pkItems.length) {
        throw new BadRequestException('此客戶目前沒有可包的已撿完貨（可能已包或尚未撿完）');
      }

      // pkId：全部來自同一張隱形撿貨單時填、跨多張時 null（逐行溯源）
      const pkIds = await tx.nx03PkItem.findMany({
        where: { id: { in: pkItems.map((i) => i.id) } },
        select: { pkId: true },
      });
      const uniquePkIds = [...new Set(pkIds.map((p) => p.pkId))];
      const singlePkId = uniquePkIds.length === 1 ? uniquePkIds[0] : null;

      const docNo = await allocNx03DocNo(tx, tenantId, 'PL', wh.code);
      const pl = await tx.nx03Pl.create({
        data: {
          tenantId,
          warehouseId: wh.id,
          docNo,
          plDate: new Date(),
          pkId: singlePkId,
          customerId: dto.customerId.trim(),
          plType: dto.deliveryType,
          status: PlStatus.COUNTING, // 建單即包貨中
          startedAt: new Date(),
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true, docNo: true },
      });

      // 預設一箱一張 SO：每張 SO 產一個包裹、行掛該包裹
      const bySo = new Map<string, typeof pkItems>();
      for (const it of pkItems) {
        const arr = bySo.get(it.refSoId!) ?? [];
        arr.push(it);
        bySo.set(it.refSoId!, arr);
      }
      let line = 1;
      const soItemIds: string[] = [];
      for (const [, items] of bySo) {
        const parcelNo = await this.allocParcelNo(tx, tenantId, wh.code);
        const parcel = await tx.nx03Parcel.create({
          data: {
            tenantId,
            plId: pl.id,
            parcelNo,
            parcelType: dto.deliveryType,
            fromWarehouseId: wh.id,
            // 寄貨物流商 / 配送收件人於封箱後三區補（階段3）
            createdBy: user.sub,
            updatedBy: user.sub,
          },
          select: { id: true },
        });
        for (const it of items) {
          await tx.nx03PlItem.create({
            data: {
              plId: pl.id,
              parcelId: parcel.id,
              pkItemId: it.id,
              lineNo: line++,
              partId: it.partId,
              partNo: it.partNo,
              partName: it.partName,
              qty: it.qty,
              updatedBy: user.sub,
            },
          });
          if (it.refSoItemId) soItemIds.push(it.refSoItemId);
        }
      }

      // 包貨啟動 → SO 行 fulfillStatus PK→PL（包貨中）
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds, to: 'PL', userId: user.sub });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: pl.docNo,
        summary: `建立包貨單（客戶 ${dto.customerId.trim()}、${bySo.size} 箱 / ${pkItems.length} 行、預設一箱一單）`,
      });
      return this.getPackingDetail(tx, tenantId, pl.id);
    });
  }

  /** 併箱：把來源包裹的貨全部併進目標包裹、刪空來源包裹（同客戶省包材）。 */
  async mergeParcels(user: RequestUser, dto: MergeParcelsDto) {
    const tenantId = requireTenantId(user);
    if (dto.sourceParcelId === dto.targetParcelId) {
      throw new BadRequestException('來源與目標包裹相同');
    }
    return this.prisma.$transaction(async (tx) => {
      const pl = await tx.nx03Pl.findFirst({
        where: { id: dto.plId.trim(), tenantId },
        select: { id: true, status: true },
      });
      if (!pl) throw new NotFoundException('Pl not found');
      if (pl.status !== PlStatus.PENDING && pl.status !== PlStatus.COUNTING) {
        throw new BadRequestException('包貨單已封箱/寄出，不可併箱');
      }
      const [src, tgt] = await Promise.all([
        tx.nx03Parcel.findFirst({ where: { id: dto.sourceParcelId.trim(), plId: pl.id, tenantId }, select: { id: true } }),
        tx.nx03Parcel.findFirst({ where: { id: dto.targetParcelId.trim(), plId: pl.id, tenantId }, select: { id: true } }),
      ]);
      if (!src || !tgt) throw new BadRequestException('來源或目標包裹不屬於此包貨單');

      await tx.nx03PlItem.updateMany({
        where: { plId: pl.id, parcelId: src.id },
        data: { parcelId: tgt.id, updatedBy: user.sub },
      });
      await tx.nx03Parcel.delete({ where: { id: src.id } });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: '',
        summary: '併箱（來源包裹併入目標、刪空箱）',
      });
      return this.getPackingDetail(tx, tenantId, pl.id);
    });
  }

  /** 封箱：包貨單 C→F 完成。 */
  async sealPacking(user: RequestUser, dto: SealPackingDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const pl = await tx.nx03Pl.findFirst({
        where: { id: dto.plId.trim(), tenantId },
        select: { id: true, docNo: true, status: true },
      });
      if (!pl) throw new NotFoundException('Pl not found');
      if (pl.status !== PlStatus.COUNTING) {
        throw new BadRequestException(`包貨單狀態 ${pl.status} 不可封箱（需包貨中 C）`);
      }
      await tx.nx03Pl.update({
        where: { id: pl.id },
        data: { status: PlStatus.FINISHED, completedAt: new Date(), completedBy: user.sub, updatedBy: user.sub },
      });

      // SALES-FLOW 階段3（D6）：封箱→涵蓋的 SO 全部 PICKING→SHIPPED（已出倉待簽收、不過帳）。
      // 配送不在此產 DN——封箱後包裹進「配送區」待配、由組長配單組單（含多 SO）；自取/寄貨進各自區。
      const soRows = await tx.nx03PlItem.findMany({
        where: { plId: pl.id },
        select: { pkItem: { select: { refSoId: true, refSo: { select: { status: true } } } } },
      });
      const soMap = new Map<string, { status: string }>();
      for (const r of soRows) {
        const so = r.pkItem?.refSo;
        const soId = r.pkItem?.refSoId;
        if (soId && so) soMap.set(soId, { status: so.status });
      }
      // 封箱時間戳（單據計時 KPI 中段點）：每次封箱覆寫 sealed_at＝取最後一箱那刻。
      // PICKING 的才順帶推 SHIPPED（已出倉待簽收）；已 SHIPPED 的只覆寫 sealed_at（後續箱）。
      const sealedAt = new Date();
      for (const [soId, so] of soMap) {
        await tx.nx04So.update({
          where: { id: soId },
          data: {
            sealedAt,
            ...(so.status === SoStatus.PICKING ? { status: SoStatus.SHIPPED } : {}),
            updatedBy: user.sub,
          },
        });
      }

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'FINISH',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: pl.docNo,
        summary: `封箱（包貨完成、涵蓋 ${soMap.size} 張 SO→已出倉待簽收）`,
      });
      return this.getPackingDetail(tx, tenantId, pl.id);
    });
  }

  /** 包貨單詳情（含包裹 + 每箱行）。 */
  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.getPackingDetail(this.prisma, tenantId, id);
  }

  private async getPackingDetail(
    db: PrismaService | Prisma.TransactionClient,
    tenantId: string,
    plId: string,
  ) {
    const pl = await db.nx03Pl.findFirst({
      where: { id: plId, tenantId },
      select: {
        id: true,
        docNo: true,
        plDate: true,
        plType: true,
        status: true,
        pkId: true,
        customerId: true,
        warehouseId: true,
        customer: { select: { name: true } },
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!pl) throw new NotFoundException('Pl not found');
    const parcels = await db.nx03Parcel.findMany({
      where: { plId, tenantId },
      orderBy: { parcelNo: 'asc' },
      select: { id: true, parcelNo: true, parcelType: true, weightKg: true, logisticsTrackingNo: true },
    });
    const items = await db.nx03PlItem.findMany({
      where: { plId },
      orderBy: { lineNo: 'asc' },
      select: {
        id: true,
        parcelId: true,
        pkItemId: true,
        lineNo: true,
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        pkItem: { select: { refSoId: true, refSo: { select: { docNo: true } } } },
      },
    });
    return {
      id: pl.id,
      docNo: pl.docNo,
      plDate: pl.plDate ? pl.plDate.toISOString().slice(0, 10) : null,
      plType: pl.plType,
      status: pl.status,
      pkId: pl.pkId,
      customerId: pl.customerId,
      customerName: pl.customer?.name ?? '—',
      warehouseId: pl.warehouseId,
      warehouseCode: pl.warehouse?.code ?? '',
      warehouseName: pl.warehouse?.name ?? '',
      parcels: parcels.map((p) => ({
        id: p.id,
        parcelNo: p.parcelNo,
        parcelType: p.parcelType,
        weightKg: p.weightKg?.toString() ?? null,
        logisticsTrackingNo: p.logisticsTrackingNo,
        lines: items
          .filter((it) => it.parcelId === p.id)
          .map((it) => ({
            id: it.id,
            lineNo: it.lineNo,
            partNo: it.partNo,
            partName: it.partName,
            qty: it.qty.toString(),
            soDocNo: it.pkItem?.refSo?.docNo ?? null,
          })),
      })),
    };
  }
}
