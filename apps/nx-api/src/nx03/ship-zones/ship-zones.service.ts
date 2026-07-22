// apps/nx-api/src/nx03/ship-zones/ship-zones.service.ts
// 出貨三區 service（SALES-FLOW 階段 3b、2026-07-22 執行長拍板）
//
// 封箱後依出貨方式路由三個工作佇列：
//   · 自取區(P)：客人來取、核對簽收 → 過帳完成
//   · 寄貨區(C)：交物流、輸物流商+單號 → 視同送達過帳完成（D5）
//   · 配送區(D)：組長把多張已封箱配送單組成一趟（一張配送單 DN、含多停靠點/多 SO）派外務；
//                外務送達客人簽收（走既有 nx06 DN 簽收）→ 過帳完成
//
// 過帳點統一：自取/寄貨在此把 SO 行推到 F、呼叫 SoService.maybeCompleteAfterDelivery（tx 外、階段3a 已內建扣帳）；
//   配送於配單時推行到 D（配送中），最終 F + 過帳由 nx06 DN 簽收觸發。

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import { SoService } from '../../nx04/so/so.service';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { advanceSoItemsFulfill } from '../../shared/nx03/nx03-fulfill-advance';
import { PlStatus } from '../../shared/nx03/nx03-state-machine';
import { allocNx06DnDocNo } from '../../shared/nx06/nx06-doc-no';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateDeliveryRunDto, ShipMailDto, ShipZonesQueryDto, SignPickupDto } from './dto/ship-zones.dto';

interface ZoneItem {
  plId: string;
  docNo: string;
  customerId: string | null;
  customerName: string;
  warehouseCode: string;
  parcelCount: number;
  soDocNos: string[];
  deliveryAddress: string | null; // 配送用
  logisticsProvider: string | null; // 寄貨用
  logisticsTrackingNo: string | null; // 寄貨用
}

@Injectable()
export class ShipZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly soService: SoService,
  ) {}

  /** 由 PL 反查 SO 行 id + SO id。 */
  private async refsOfPl(
    db: PrismaService | Prisma.TransactionClient,
    plId: string,
  ): Promise<{ soItemIds: string[]; soIds: string[] }> {
    const items = await db.nx03PlItem.findMany({
      where: { plId },
      select: { pkItem: { select: { refSoItemId: true, refSoId: true } } },
    });
    const soItemIds = [...new Set(items.map((i) => i.pkItem?.refSoItemId).filter((x): x is string => !!x))];
    const soIds = [...new Set(items.map((i) => i.pkItem?.refSoId).filter((x): x is string => !!x))];
    return { soItemIds, soIds };
  }

  /** 三區佇列：封箱(F)/已寄出(S) 且涵蓋 SO 尚未全部完成的包貨單，依出貨方式分桶。 */
  async getZones(user: RequestUser, q: ShipZonesQueryDto) {
    const tenantId = requireTenantId(user);
    const where: Prisma.Nx03PlWhereInput = {
      tenantId,
      status: { in: [PlStatus.FINISHED, PlStatus.SHIPPED] },
    };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();

    const pls = await this.prisma.nx03Pl.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        docNo: true,
        plType: true,
        customerId: true,
        logisticsProvider: true,
        logisticsTrackingNo: true,
        customer: { select: { name: true } },
        warehouse: { select: { code: true } },
        rev_Nx03Parcel_plId: { select: { id: true } },
        rev_Nx03PlItem_plId: {
          select: {
            pkItem: {
              select: { refSo: { select: { id: true, docNo: true, status: true, deliveryAddress: true } } },
            },
          },
        },
      },
    });

    // 判斷配送包裹是否已進配送單（已配單就不列待配）
    const allParcelIds = pls.flatMap((p) => p.rev_Nx03Parcel_plId.map((x) => x.id));
    const dispatched = allParcelIds.length
      ? await this.prisma.nx06DnItem.findMany({
          where: { parcelId: { in: allParcelIds } },
          select: { parcelId: true },
        })
      : [];
    const dispatchedParcels = new Set(dispatched.map((d) => d.parcelId));

    const pickup: ZoneItem[] = [];
    const mail: ZoneItem[] = [];
    const delivery: ZoneItem[] = [];
    for (const pl of pls) {
      const sos = new Map<string, { docNo: string; status: string; address: string | null }>();
      for (const it of pl.rev_Nx03PlItem_plId) {
        const so = it.pkItem?.refSo;
        if (so) sos.set(so.id, { docNo: so.docNo, status: so.status, address: so.deliveryAddress });
      }
      const soList = [...sos.values()];
      // 涵蓋 SO 全部 COMPLETED → 已完成、不列
      if (soList.length > 0 && soList.every((s) => s.status === 'COMPLETED')) continue;

      const item: ZoneItem = {
        plId: pl.id,
        docNo: pl.docNo,
        customerId: pl.customerId,
        customerName: pl.customer?.name ?? '—',
        warehouseCode: pl.warehouse?.code ?? '',
        parcelCount: pl.rev_Nx03Parcel_plId.length,
        soDocNos: soList.map((s) => s.docNo),
        deliveryAddress: soList.find((s) => s.address)?.address ?? null,
        logisticsProvider: pl.logisticsProvider,
        logisticsTrackingNo: pl.logisticsTrackingNo,
      };
      if (pl.plType === 'P') pickup.push(item);
      else if (pl.plType === 'C') mail.push(item);
      else if (pl.plType === 'D') {
        // 配送：包裹已全進配送單則不列待配
        const parcelIds = pl.rev_Nx03Parcel_plId.map((x) => x.id);
        const allDispatched = parcelIds.length > 0 && parcelIds.every((id) => dispatchedParcels.has(id));
        if (!allDispatched) delivery.push(item);
      }
    }
    return { pickup, mail, delivery };
  }

  /** 自取簽收：客人取貨核對後簽收 → SO 行推 F → 過帳完成。 */
  async signPickup(user: RequestUser, dto: SignPickupDto) {
    const tenantId = requireTenantId(user);
    const soIds = await this.prisma.$transaction(async (tx) => {
      const pl = await tx.nx03Pl.findFirst({
        where: { id: dto.plId.trim(), tenantId },
        select: { id: true, docNo: true, plType: true, status: true },
      });
      if (!pl) throw new NotFoundException('包貨單不存在');
      if (pl.plType !== 'P') throw new BadRequestException('此包貨單非自取');
      if (pl.status !== PlStatus.FINISHED) throw new BadRequestException('此包貨單未封箱或已處理');
      const { soItemIds, soIds } = await this.refsOfPl(tx, pl.id);
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds, to: 'F', userId: user.sub });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'FINISH',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: pl.docNo,
        summary: `自取簽收（簽收人：${dto.signerName.trim()}）`,
      });
      return soIds;
    });
    // tx 外推完成鉤（內含扣庫存 + 開應收、階段3a）
    for (const soId of soIds) {
      await this.soService.maybeCompleteAfterDelivery(tenantId, soId, user.sub);
    }
    return { ok: true, completedSoCount: soIds.length };
  }

  /** 寄貨寄出：交物流輸物流商+單號 → 寫 PL/包裹 → SO 行推 F（視同送達 D5）→ 過帳完成。 */
  async shipMail(user: RequestUser, dto: ShipMailDto) {
    const tenantId = requireTenantId(user);
    const soIds = await this.prisma.$transaction(async (tx) => {
      const pl = await tx.nx03Pl.findFirst({
        where: { id: dto.plId.trim(), tenantId },
        select: { id: true, docNo: true, plType: true, status: true },
      });
      if (!pl) throw new NotFoundException('包貨單不存在');
      if (pl.plType !== 'C') throw new BadRequestException('此包貨單非寄貨');
      if (pl.status !== PlStatus.FINISHED) throw new BadRequestException('此包貨單未封箱或已寄出');
      await tx.nx03Pl.update({
        where: { id: pl.id },
        data: {
          logisticsProvider: dto.logisticsProvider.trim(),
          logisticsTrackingNo: dto.trackingNo.trim(),
          status: PlStatus.SHIPPED,
          shippedAt: new Date(),
          shippedBy: user.sub,
          updatedBy: user.sub,
        },
      });
      await tx.nx03Parcel.updateMany({
        where: { plId: pl.id },
        data: { logisticsTrackingNo: dto.trackingNo.trim(), updatedBy: user.sub },
      });
      const { soItemIds, soIds } = await this.refsOfPl(tx, pl.id);
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds, to: 'F', userId: user.sub });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'SHIP',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: pl.docNo,
        summary: `寄貨寄出（${dto.logisticsProvider.trim()} / ${dto.trackingNo.trim()}）`,
      });
      return soIds;
    });
    for (const soId of soIds) {
      await this.soService.maybeCompleteAfterDelivery(tenantId, soId, user.sub);
    }
    return { ok: true, completedSoCount: soIds.length };
  }

  /**
   * 配送配單：把多張已封箱的配送包貨單組成一趟配送單（含多停靠點/多 SO），指派外務。
   * 停靠點 = 同（客戶 + 送貨地址）一站。外務送達客人簽收（走既有 nx06 DN 簽收）→ 過帳完成。
   */
  async createDeliveryRun(user: RequestUser, dto: CreateDeliveryRunDto) {
    const tenantId = requireTenantId(user);
    const plIds = [...new Set(dto.plIds.map((s) => s.trim()).filter(Boolean))];
    if (!plIds.length) throw new BadRequestException('未選任何包貨單');

    return this.prisma.$transaction(async (tx) => {
      const pls = await tx.nx03Pl.findMany({
        where: { id: { in: plIds }, tenantId },
        select: {
          id: true,
          plType: true,
          status: true,
          warehouseId: true,
          warehouse: { select: { code: true } },
        },
      });
      if (pls.length !== plIds.length) throw new BadRequestException('部分包貨單不存在');
      for (const pl of pls) {
        if (pl.plType !== 'D') throw new BadRequestException('僅配送包貨單可配單');
        if (pl.status !== PlStatus.FINISHED) throw new BadRequestException('包貨單須為已封箱狀態');
      }
      const whId = pls[0].warehouseId;
      if (pls.some((p) => p.warehouseId !== whId)) {
        throw new BadRequestException('同一趟配送須同出貨倉');
      }
      const driver = await tx.nx01User.findFirst({
        where: { id: dto.driverUserId.trim(), tenantId },
        select: { id: true },
      });
      if (!driver) throw new BadRequestException('外務人員不存在');

      // 撈這批 PL 的包裹 + 逐行（含來源 SO / 客戶 / 地址）
      const parcels = await tx.nx03Parcel.findMany({
        where: { plId: { in: plIds } },
        select: { id: true },
      });
      const parcelIds = parcels.map((p) => p.id);
      const already = await tx.nx06DnItem.findFirst({
        where: { parcelId: { in: parcelIds } },
        select: { id: true },
      });
      if (already) throw new BadRequestException('部分包裹已在其他配送單、不可重複配單');

      const lines = await tx.nx03PlItem.findMany({
        where: { plId: { in: plIds } },
        select: {
          parcelId: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          pkItem: {
            select: {
              refSoId: true,
              refSoItemId: true,
              refSo: {
                select: {
                  customerId: true,
                  deliveryAddress: true,
                  customer: { select: { contactName: true, phone: true, mobile: true } },
                },
              },
            },
          },
        },
      });
      if (!lines.length) throw new BadRequestException('選定包貨單無可配送明細');

      const docNo = await allocNx06DnDocNo(tx, tenantId, pls[0].warehouse.code);
      const dn = await tx.nx06Dn.create({
        data: {
          tenantId,
          warehouseId: whId,
          docNo,
          dnDate: new Date(),
          driverUserId: driver.id,
          logisticsType: 'DELIVERY',
          status: 'DRAFT',
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });

      // 停靠點分組：同（客戶 + 送貨地址）一站
      const stopKey = (customerId: string | null, addr: string | null) => `${customerId ?? ''}|${addr ?? ''}`;
      const stopIdByKey = new Map<string, string>();
      let stopNo = 1;
      const soItemIds: string[] = [];
      let lineNo = 1;
      for (const l of lines) {
        const so = l.pkItem?.refSo;
        const key = stopKey(so?.customerId ?? null, so?.deliveryAddress ?? null);
        let stopId = stopIdByKey.get(key);
        if (!stopId) {
          const stop = await tx.nx06DnStop.create({
            data: {
              dnId: dn.id,
              stopNo: stopNo++,
              taskType: 'D',
              partnerId: so?.customerId ?? null,
              address: so?.deliveryAddress?.trim() || '（未填送貨地址）',
              contactName: so?.customer?.contactName ?? null,
              contactPhone: so?.customer?.phone ?? so?.customer?.mobile ?? null,
              status: 'P',
              updatedBy: user.sub,
            },
            select: { id: true },
          });
          stopId = stop.id;
          stopIdByKey.set(key, stopId);
        }
        await tx.nx06DnItem.create({
          data: {
            dnId: dn.id,
            stopId,
            lineNo: lineNo++,
            sourceDocType: 'SO',
            sourceDocId: l.pkItem?.refSoId ?? '',
            sourceItemId: l.pkItem?.refSoItemId ?? null,
            parcelId: l.parcelId,
            partId: l.partId,
            partNo: l.partNo,
            partName: l.partName,
            qty: l.qty,
            deliveryStatus: 'P',
            updatedBy: user.sub,
          },
        });
        if (l.pkItem?.refSoItemId) soItemIds.push(l.pkItem.refSoItemId);
      }

      // 配單 → SO 行 fulfillStatus PL→D（配送中）；最終 F + 過帳由 nx06 DN 簽收觸發
      await advanceSoItemsFulfill(tx, { tenantId, soItemIds, to: 'D', userId: user.sub });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_dn',
        entityId: dn.id,
        entityCode: docNo,
        summary: `配送配單（${plIds.length} 張包貨單 / ${stopIdByKey.size} 停靠點、派外務 ${driver.id}）`,
      });
      return { dnId: dn.id, docNo, stopCount: stopIdByKey.size, plCount: plIds.length };
    });
  }
}
