import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../shared/nx01/require-tenant';
import { composePartnerDefaultShippingAddress } from '../shared/nx01/compose-partner-address';
import { allocNx06DnDocNo } from '../shared/nx06/nx06-doc-no';
import { Nx06ListQueryDto } from '../shared/nx06/nx06-list-query.dto';
import {
  assertDnStatusTransition,
  LogisticsKind,
  type LogisticsKindValue,
} from '../shared/nx06/nx06-state-machine';
import { Nx01AuditLogWriterService } from '../shared/services/nx01-audit-log-writer.service';

import {
  CreateDeliveryDto,
  PatchDeliveryDto,
  PatchDnLocationDto,
} from './delivery/delivery.dto';
import { CreateIntlShippingDto, PatchIntlShippingDto } from './intl-shipping/intl-shipping.dto';
import { CreatePickupDto, PatchPickupDto } from './pickup/pickup.dto';
import { CreateReturnPickupDto, PatchReturnPickupDto } from './return-pickup/return-pickup.dto';

const ITEM_SEL = {
  id: true,
  dnId: true,
  stopId: true,
  lineNo: true,
  sourceDocType: true,
  sourceDocId: true,
  sourceItemId: true,
  parcelId: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  deliveryStatus: true,
  exceptionType: true,
  exceptionReason: true,
  internalCost: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const STOP_SEL = {
  id: true,
  dnId: true,
  stopNo: true,
  taskType: true,
  partnerId: true,
  warehouseId: true,
  address: true,
  contactName: true,
  contactPhone: true,
  status: true,
  arrivedAt: true,
  completedAt: true,
  signerType: true,
  signedAt: true,
  signedByName: true,
  signatureUrl: true,
  exceptionRemark: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const DN_SEL = {
  id: true,
  tenantId: true,
  warehouseId: true,
  docNo: true,
  dnDate: true,
  driverUserId: true,
  vehicleNo: true,
  logisticsType: true,
  status: true,
  lastLat: true,
  lastLng: true,
  lastLocationAt: true,
  customsDeclarationNo: true,
  originPort: true,
  destinationPort: true,
  etaDate: true,
  sourceSoId: true,
  sourceSrId: true,
  departedAt: true,
  completedAt: true,
  printerDeviceId: true,
  printedAt: true,
  lalamoveOrderId: true,
  lalamoveTrackingNo: true,
  lalamoveCallbackStatus: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function displayStatus(kind: LogisticsKindValue, status: string): string {
  return status;
}

@Injectable()
export class DnLogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, kind: LogisticsKindValue, q: Nx06ListQueryDto): Prisma.Nx06DnWhereInput {
    const parts: Prisma.Nx06DnWhereInput[] = [{ tenantId, logisticsType: kind }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
          { customsDeclarationNo: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  private async mapDetail(
    tenantId: string,
    id: string,
    kind: LogisticsKindValue,
  ): Promise<Record<string, unknown>> {
    const row = await this.prisma.nx06Dn.findFirst({
      where: { id, tenantId, logisticsType: kind },
      select: {
        ...DN_SEL,
        rev_Nx06DnStop_dnId: {
          orderBy: { stopNo: 'asc' },
          select: {
            ...STOP_SEL,
            rev_Nx06DnItem_stopId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Document not found');
    const { rev_Nx06DnStop_dnId: stops, ...head } = row;
    return {
      ...head,
      displayStatus: displayStatus(kind, head.status),
      stops: stops.map((st) => {
        const { rev_Nx06DnItem_stopId: items, ...rest } = st;
        return { ...rest, items };
      }),
    };
  }

  async list(user: RequestUser, q: Nx06ListQueryDto, kind: LogisticsKindValue) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, kind, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx06Dn.count({ where }),
      this.prisma.nx06Dn.findMany({
        where,
        orderBy: [{ dnDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: DN_SEL,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => ({ ...r, displayStatus: displayStatus(kind, r.status) })),
    };
  }

  async getById(user: RequestUser, id: string, kind: LogisticsKindValue) {
    const tenantId = requireTenantId(user);
    return this.mapDetail(tenantId, id, kind);
  }

  async createDelivery(user: RequestUser, dto: CreateDeliveryDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new NotFoundException('warehouseId not found');
      await tx.nx01User.findFirstOrThrow({
        where: { id: dto.driverUserId, tenantId },
        select: { id: true },
      });
      const docNo = await allocNx06DnDocNo(tx, tenantId, wh.code);
      const dn = await tx.nx06Dn.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          docNo,
          dnDate: new Date(dto.dnDate),
          driverUserId: dto.driverUserId,
          vehicleNo: dto.vehicleNo?.trim() || null,
          logisticsType: LogisticsKind.DELIVERY,
          status: 'DRAFT',
          sourceSoId: dto.sourceSoId?.trim() || null,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      let stopNo = 1;
      for (const st of dto.stops) {
        const stop = await tx.nx06DnStop.create({
          data: {
            dnId: dn.id,
            stopNo: stopNo++,
            taskType: (st.taskType || 'D').trim(),
            partnerId: st.partnerId?.trim() || null,
            warehouseId: st.warehouseId?.trim() || null,
            address: st.address.trim(),
            contactName: st.contactName?.trim() || null,
            contactPhone: st.contactPhone?.trim() || null,
            status: 'P',
            updatedBy: user.sub,
          },
          select: { id: true },
        });
        let lineNo = 1;
        for (const it of st.items) {
          const qNum = typeof it.qty === 'number' ? it.qty : Number((it as { qty?: unknown }).qty);
          if (!Number.isFinite(qNum) || qNum <= 0) {
            throw new BadRequestException('each item qty must be a positive number');
          }
          const qty = new PrismaNs.Decimal(qNum);
          await tx.nx06DnItem.create({
            data: {
              dnId: dn.id,
              stopId: stop.id,
              lineNo: lineNo++,
              sourceDocType: it.sourceDocType.trim(),
              sourceDocId: it.sourceDocId.trim(),
              sourceItemId: it.sourceItemId?.trim() || null,
              partId: it.partId?.trim() || null,
              partNo: it.partNo?.trim() || null,
              partName: it.partName?.trim() || null,
              qty,
              deliveryStatus: 'P',
              updatedBy: user.sub,
            },
          });
        }
      }
      const full = await this.mapDetailTx(tx, tenantId, dn.id, LogisticsKind.DELIVERY);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_dn',
        entityId: dn.id,
        entityCode: (full as { docNo: string }).docNo,
        summary: '建立送貨單',
        afterData: full as object,
      });
      return full;
    });
  }

  private async mapDetailTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    kind: LogisticsKindValue,
  ) {
    const row = await tx.nx06Dn.findFirst({
      where: { id, tenantId, logisticsType: kind },
      select: {
        ...DN_SEL,
        rev_Nx06DnStop_dnId: {
          orderBy: { stopNo: 'asc' },
          select: {
            ...STOP_SEL,
            rev_Nx06DnItem_stopId: { orderBy: { lineNo: 'asc' }, select: ITEM_SEL },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Document not found');
    const { rev_Nx06DnStop_dnId: stops, ...head } = row;
    return {
      ...head,
      displayStatus: displayStatus(kind, head.status),
      stops: stops.map((st) => {
        const { rev_Nx06DnItem_stopId: items, ...rest } = st;
        return { ...rest, items };
      }),
    };
  }

  async createPickup(user: RequestUser, dto: CreatePickupDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new NotFoundException('warehouseId not found');
      await tx.nx01User.findFirstOrThrow({
        where: { id: dto.driverUserId, tenantId },
        select: { id: true },
      });
      const docNo = await allocNx06DnDocNo(tx, tenantId, wh.code);
      const dn = await tx.nx06Dn.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          docNo,
          dnDate: new Date(dto.dnDate),
          driverUserId: dto.driverUserId,
          vehicleNo: dto.vehicleNo?.trim() || null,
          logisticsType: LogisticsKind.PICKUP,
          status: 'DRAFT',
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      const stop = await tx.nx06DnStop.create({
        data: {
          dnId: dn.id,
          stopNo: 1,
          taskType: 'K',
          partnerId: dto.partnerId.trim(),
          warehouseId: dto.targetWarehouseId?.trim() || null,
          address: dto.address.trim(),
          contactName: dto.contactName?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          status: 'P',
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      let lineNo = 1;
      for (const it of dto.items) {
        const qNum = typeof it.qty === 'number' ? it.qty : Number((it as { qty?: unknown }).qty);
        if (!Number.isFinite(qNum) || qNum <= 0) {
          throw new BadRequestException('each item qty must be a positive number');
        }
        await tx.nx06DnItem.create({
          data: {
            dnId: dn.id,
            stopId: stop.id,
            lineNo: lineNo++,
            sourceDocType: it.sourceDocType.trim(),
            sourceDocId: it.sourceDocId.trim(),
            sourceItemId: it.sourceItemId?.trim() || null,
            partId: it.partId.trim(),
            partNo: it.partNo.trim(),
            partName: it.partName.trim(),
            qty: new PrismaNs.Decimal(qNum),
            deliveryStatus: 'P',
            updatedBy: user.sub,
          },
        });
      }
      const full = await this.mapDetailTx(tx, tenantId, dn.id, LogisticsKind.PICKUP);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_dn',
        entityId: dn.id,
        entityCode: (full as { docNo: string }).docNo,
        summary: '建立取貨單',
        afterData: full as object,
      });
      return full;
    });
  }

  async createIntlShipping(user: RequestUser, dto: CreateIntlShippingDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new NotFoundException('warehouseId not found');
      await tx.nx01User.findFirstOrThrow({
        where: { id: dto.driverUserId, tenantId },
        select: { id: true },
      });
      const docNo = await allocNx06DnDocNo(tx, tenantId, wh.code);
      const dn = await tx.nx06Dn.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          docNo,
          dnDate: new Date(dto.dnDate),
          driverUserId: dto.driverUserId,
          vehicleNo: dto.vehicleNo?.trim() || null,
          logisticsType: LogisticsKind.INTL_SHIPPING,
          status: 'DRAFT',
          customsDeclarationNo: dto.customsDeclarationNo.trim(),
          originPort: dto.originPort.trim(),
          destinationPort: dto.destinationPort.trim(),
          etaDate: new Date(dto.etaDate),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      const stop = await tx.nx06DnStop.create({
        data: {
          dnId: dn.id,
          stopNo: 1,
          taskType: 'D',
          partnerId: dto.partnerId?.trim() || null,
          address: dto.address.trim(),
          contactName: dto.contactName?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          status: 'P',
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      let lineNo = 1;
      for (const it of dto.items) {
        const qNum = typeof it.qty === 'number' ? it.qty : Number((it as { qty?: unknown }).qty);
        if (!Number.isFinite(qNum) || qNum <= 0) {
          throw new BadRequestException('each item qty must be a positive number');
        }
        await tx.nx06DnItem.create({
          data: {
            dnId: dn.id,
            stopId: stop.id,
            lineNo: lineNo++,
            sourceDocType: it.sourceDocType.trim(),
            sourceDocId: it.sourceDocId.trim(),
            sourceItemId: it.sourceItemId?.trim() || null,
            partId: it.partId?.trim() || null,
            partNo: it.partNo?.trim() || null,
            partName: it.partName?.trim() || null,
            qty: new PrismaNs.Decimal(qNum),
            deliveryStatus: 'P',
            updatedBy: user.sub,
          },
        });
      }
      const full = await this.mapDetailTx(tx, tenantId, dn.id, LogisticsKind.INTL_SHIPPING);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_dn',
        entityId: dn.id,
        entityCode: (full as { docNo: string }).docNo,
        summary: '建立國際物流單',
        afterData: full as object,
      });
      return full;
    });
  }

  async createReturnPickup(user: RequestUser, dto: CreateReturnPickupDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const sr = await tx.nx04Sr.findFirst({
        where: { id: dto.srId, tenantId },
        select: {
          id: true,
          warehouseId: true,
          customerId: true,
          srDate: true,
        },
      });
      if (!sr) throw new NotFoundException('srId not found');
      const dup = await tx.nx06Dn.findFirst({
        where: { tenantId, sourceSrId: sr.id, logisticsType: LogisticsKind.RETURN_PICKUP },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Return pickup already exists for this SR');
      const cust = await tx.nx01Partner.findFirst({
        where: { id: sr.customerId, tenantId },
        select: { contactName: true, phone: true, mobile: true },
      });
      // 02 對齊第二批 A 軌 CP2 2026-06-06：partner.address 已 DROP、改取 partner_address 預設送貨地址
      const defaultShipping = await composePartnerDefaultShippingAddress(this.prisma, tenantId, sr.customerId);
      const addr = dto.pickupAddress?.trim() || defaultShipping?.oneLine;
      if (!addr) throw new BadRequestException('pickupAddress or customer address required');
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId ?? sr.warehouseId, tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new NotFoundException('warehouse not found');
      const docNo = await allocNx06DnDocNo(tx, tenantId, wh.code);
      const dn = await tx.nx06Dn.create({
        data: {
          tenantId,
          warehouseId: wh.id,
          docNo,
          dnDate: new Date(dto.dnDate ?? sr.srDate),
          driverUserId: dto.driverUserId,
          vehicleNo: dto.vehicleNo?.trim() || null,
          logisticsType: LogisticsKind.RETURN_PICKUP,
          status: 'DRAFT',
          sourceSrId: sr.id,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      const stop = await tx.nx06DnStop.create({
        data: {
          dnId: dn.id,
          stopNo: 1,
          taskType: 'C',
          partnerId: sr.customerId,
          address: addr,
          contactName: cust?.contactName ?? null,
          contactPhone: cust?.phone ?? cust?.mobile ?? null,
          status: 'P',
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      const lines = await tx.nx04SrItem.findMany({
        where: { srId: sr.id },
        orderBy: { lineNo: 'asc' },
        select: {
          id: true,
          lineNo: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
        },
      });
      for (const it of lines) {
        await tx.nx06DnItem.create({
          data: {
            dnId: dn.id,
            stopId: stop.id,
            lineNo: it.lineNo,
            sourceDocType: 'SR',
            sourceDocId: sr.id,
            sourceItemId: it.id,
            partId: it.partId,
            partNo: it.partNo,
            partName: it.partName,
            qty: it.qty,
            deliveryStatus: 'P',
            updatedBy: user.sub,
          },
        });
      }
      const full = await this.mapDetailTx(tx, tenantId, dn.id, LogisticsKind.RETURN_PICKUP);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_dn',
        entityId: dn.id,
        entityCode: (full as { docNo: string }).docNo,
        summary: '建立退貨取件單',
        afterData: full as object,
      });
      return full;
    });
  }

  private terminalSuccess(kind: LogisticsKindValue, status: string): boolean {
    if (kind === LogisticsKind.DELIVERY || kind === LogisticsKind.INTL_SHIPPING) return status === 'DELIVERED';
    return status === 'PICKED_UP';
  }

  private async applySignatureToStops(
    tx: Prisma.TransactionClient,
    p: {
      dnId: string;
      userId: string;
      signerType: string;
      signerName: string;
      signatureUrl?: string | null;
      stopId?: string | null;
    },
  ) {
    const stops = await tx.nx06DnStop.findMany({
      where: { dnId: p.dnId, ...(p.stopId ? { id: p.stopId } : {}) },
      select: { id: true },
    });
    if (!stops.length) throw new BadRequestException('No stops to sign');
    const now = new Date();
    for (const s of stops) {
      await tx.nx06DnStop.update({
        where: { id: s.id },
        data: {
          signerType: p.signerType,
          signedAt: now,
          signedByName: p.signerName,
          signatureUrl: p.signatureUrl?.trim() || null,
          status: 'C',
          completedAt: now,
          updatedBy: p.userId,
        },
      });
      await tx.nx06DnItem.updateMany({
        where: { stopId: s.id },
        data: { deliveryStatus: 'C', updatedBy: p.userId },
      });
    }
  }

  async patchDelivery(user: RequestUser, id: string, dto: PatchDeliveryDto) {
    return this.patchDn(user, id, LogisticsKind.DELIVERY, dto);
  }

  async patchPickup(user: RequestUser, id: string, dto: PatchPickupDto) {
    return this.patchDn(user, id, LogisticsKind.PICKUP, dto);
  }

  async patchIntlShipping(user: RequestUser, id: string, dto: PatchIntlShippingDto) {
    return this.patchDn(user, id, LogisticsKind.INTL_SHIPPING, dto);
  }

  async patchReturnPickup(user: RequestUser, id: string, dto: PatchReturnPickupDto) {
    return this.patchDn(user, id, LogisticsKind.RETURN_PICKUP, dto);
  }

  private async patchDn(
    user: RequestUser,
    id: string,
    kind: LogisticsKindValue,
    dto: PatchDeliveryDto | PatchPickupDto | PatchIntlShippingDto | PatchReturnPickupDto,
  ) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx06Dn.findFirst({
        where: { id, tenantId, logisticsType: kind },
        select: { ...DN_SEL },
      });
      if (!existing) throw new NotFoundException('Document not found');
      assertDnStatusTransition(kind, existing.status, dto.status);
      const next = dto.status;
      /** 進入完成態時才寫簽收（避免同狀態 PATCH 重複要求 signature） */
      const terminal = this.terminalSuccess(kind, next) && existing.status !== next;
      const sig = 'signature' in dto ? dto.signature : undefined;
      if (terminal) {
        if (!sig?.signerType?.trim() || !sig?.signerName?.trim()) {
          throw new BadRequestException('signature.signerType and signature.signerName required when completing');
        }
        if (sig.signerType !== 'C' && sig.signerType !== 'W') {
          throw new BadRequestException('signature.signerType must be C or W');
        }
        await this.applySignatureToStops(tx, {
          dnId: id,
          userId: user.sub,
          signerType: sig.signerType,
          signerName: sig.signerName.trim(),
          signatureUrl: sig.signatureUrl ?? null,
          stopId: sig.stopId?.trim() || null,
        });
      }
      const departLeg =
        (next === 'DISPATCHED' && existing.status === 'DRAFT') ||
        (kind === LogisticsKind.INTL_SHIPPING && next === 'IN_TRANSIT' && existing.status === 'CUSTOMS');
      if (departLeg) {
        await tx.nx06Dn.update({
          where: { id },
          data: { departedAt: new Date(), updatedBy: user.sub },
        });
      }
      const intlDto = kind === LogisticsKind.INTL_SHIPPING ? (dto as PatchIntlShippingDto) : null;
      await tx.nx06Dn.update({
        where: { id },
        data: {
          status: next,
          ...(terminal ? { completedAt: new Date() } : {}),
          ...(dto.vehicleNo !== undefined ? { vehicleNo: dto.vehicleNo?.trim() || null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(intlDto
            ? {
                ...(intlDto.customsDeclarationNo !== undefined
                  ? { customsDeclarationNo: intlDto.customsDeclarationNo?.trim() || null }
                  : {}),
                ...(intlDto.originPort !== undefined ? { originPort: intlDto.originPort?.trim() || null } : {}),
                ...(intlDto.destinationPort !== undefined
                  ? { destinationPort: intlDto.destinationPort?.trim() || null }
                  : {}),
                ...(intlDto.etaDate !== undefined
                  ? { etaDate: intlDto.etaDate ? new Date(intlDto.etaDate) : null }
                  : {}),
              }
            : {}),
          updatedBy: user.sub,
        },
      });
      const full = await this.mapDetailTx(tx, tenantId, id, kind);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'UPDATE',
        entityTable: 'nx06_dn',
        entityId: id,
        entityCode: existing.docNo,
        summary: `NX06 ${kind} ${existing.status} -> ${next}`,
        beforeData: existing as object,
        afterData: full as object,
      });
      return full;
    });
  }

  async patchDeliveryLocation(user: RequestUser, id: string, dto: PatchDnLocationDto) {
    const tenantId = requireTenantId(user);
    const lat = typeof dto.lat === 'number' ? dto.lat : Number((dto as { lat?: unknown }).lat);
    const lng = typeof dto.lng === 'number' ? dto.lng : Number((dto as { lng?: unknown }).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng must be finite numbers');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx06Dn.findFirst({
        where: { id, tenantId, logisticsType: LogisticsKind.DELIVERY },
        select: { ...DN_SEL },
      });
      if (!existing) throw new NotFoundException('Delivery not found');
      const ts = dto.timestamp ? new Date(dto.timestamp) : new Date();
      await tx.nx06Dn.update({
        where: { id },
        data: {
          lastLat: new PrismaNs.Decimal(lat),
          lastLng: new PrismaNs.Decimal(lng),
          lastLocationAt: ts,
          updatedBy: user.sub,
        },
      });
      const full = await this.mapDetailTx(tx, tenantId, id, LogisticsKind.DELIVERY);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'UPDATE',
        entityTable: 'nx06_dn',
        entityId: id,
        entityCode: existing.docNo,
        summary: 'GPS location update',
        beforeData: { lastLat: existing.lastLat, lastLng: existing.lastLng } as object,
        afterData: { lastLat: lat, lastLng: lng, lastLocationAt: ts.toISOString() } as object,
      });
      return full;
    });
  }

  /**
   * 標記停點異常（NX06-IMPL-01 新增、overview §3.1 #6）
   *   - 寫 nx06_dn_stop.exceptionRemark + status='E'
   *   - 不改 DN 主檔 status（DN 整體狀態仍由 patchDn 推進）
   */
  async markStopException(
    user: RequestUser,
    stopId: string,
    dto: { exceptionRemark: string },
  ) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const stop = await tx.nx06DnStop.findFirst({
        where: { id: stopId, dn: { tenantId } },
        select: { id: true, dnId: true, stopNo: true, status: true },
      });
      if (!stop) throw new NotFoundException('Stop not found');
      const remark = dto.exceptionRemark?.trim();
      if (!remark) throw new BadRequestException('exceptionRemark required');

      await tx.nx06DnStop.update({
        where: { id: stop.id },
        data: { status: 'E', exceptionRemark: remark, updatedBy: user.sub },
      });

      const dn = await tx.nx06Dn.findUnique({
        where: { id: stop.dnId },
        select: { docNo: true, logisticsType: true },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'UPDATE',
        entityTable: 'nx06_dn_stop',
        entityId: stop.id,
        entityCode: dn ? `${dn.docNo}#${stop.stopNo}` : stop.id,
        summary: `停點異常標記：${remark.slice(0, 50)}`,
        beforeData: { status: stop.status } as object,
        afterData: { status: 'E', exceptionRemark: remark } as object,
      });
      return { ok: true, stopId: stop.id, status: 'E', exceptionRemark: remark };
    });
  }

  /**
   * 標記件項異常（NX06-IMPL-01 新增、overview §3.1 #6）
   *   - 寫 nx06_dn_item.exceptionType + exceptionReason + deliveryStatus='E'
   *   - exceptionType 單字元 enum：W=送錯料號 / Q=數量不符 / D=貨物損壞 / O=其他
   */
  async markItemException(
    user: RequestUser,
    itemId: string,
    dto: { exceptionType: string; exceptionReason?: string },
  ) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.nx06DnItem.findFirst({
        where: { id: itemId, dn: { tenantId } },
        select: { id: true, dnId: true, lineNo: true, deliveryStatus: true, exceptionType: true },
      });
      if (!item) throw new NotFoundException('Item not found');
      const exType = dto.exceptionType?.trim();
      if (!exType || !['W', 'Q', 'D', 'O'].includes(exType)) {
        throw new BadRequestException('exceptionType must be one of W / Q / D / O');
      }

      await tx.nx06DnItem.update({
        where: { id: item.id },
        data: {
          deliveryStatus: 'E',
          exceptionType: exType,
          exceptionReason: dto.exceptionReason?.trim() || null,
          updatedBy: user.sub,
        },
      });

      const dn = await tx.nx06Dn.findUnique({
        where: { id: item.dnId },
        select: { docNo: true },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'UPDATE',
        entityTable: 'nx06_dn_item',
        entityId: item.id,
        entityCode: dn ? `${dn.docNo}#L${item.lineNo}` : item.id,
        summary: `件項異常標記：${exType}`,
        beforeData: {
          deliveryStatus: item.deliveryStatus,
          exceptionType: item.exceptionType,
        } as object,
        afterData: {
          deliveryStatus: 'E',
          exceptionType: exType,
          exceptionReason: dto.exceptionReason?.trim() || null,
        } as object,
      });
      return {
        ok: true,
        itemId: item.id,
        deliveryStatus: 'E',
        exceptionType: exType,
      };
    });
  }

  /**
   * 設定件項內部成本（NX06-IMPL-01 新增、overview §3.1 #10 成本追蹤）
   *   - 寫 nx06_dn_item.internalCost（Decimal 14,2）
   *   - 手動寫入路徑（Lalamove webhook 自動寫入路徑見 LalamoveIntegrationService）
   */
  async setItemInternalCost(
    user: RequestUser,
    itemId: string,
    dto: { internalCost: string },
  ) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.nx06DnItem.findFirst({
        where: { id: itemId, dn: { tenantId } },
        select: { id: true, dnId: true, lineNo: true, internalCost: true },
      });
      if (!item) throw new NotFoundException('Item not found');
      const raw = dto.internalCost?.trim();
      if (!raw) throw new BadRequestException('internalCost required');
      const numCheck = Number(raw);
      if (!Number.isFinite(numCheck) || numCheck < 0) {
        throw new BadRequestException('internalCost must be a non-negative number');
      }
      const next = new PrismaNs.Decimal(raw);

      await tx.nx06DnItem.update({
        where: { id: item.id },
        data: { internalCost: next, updatedBy: user.sub },
      });

      const dn = await tx.nx06Dn.findUnique({
        where: { id: item.dnId },
        select: { docNo: true },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'UPDATE',
        entityTable: 'nx06_dn_item',
        entityId: item.id,
        entityCode: dn ? `${dn.docNo}#L${item.lineNo}` : item.id,
        summary: `件項內部成本設定：${raw}`,
        beforeData: { internalCost: item.internalCost } as object,
        afterData: { internalCost: raw } as object,
      });
      return { ok: true, itemId: item.id, internalCost: raw };
    });
  }

  /**
   * 倉管組長地圖視圖：列出所有 active DN（含 lastLat/Lng + driver name）。
   * NX06-IMPL-02 Phase 4 新增 / dashboard polling 10 秒呼叫。
   */
  async listActiveForMap(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx06Dn.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'CUSTOMS', 'ARRIVED'] },
      },
      orderBy: [{ routeBatchId: 'asc' }, { routeOrderInSequence: 'asc' }, { docNo: 'asc' }],
      select: {
        id: true,
        docNo: true,
        status: true,
        logisticsType: true,
        driverUserId: true,
        driverUser: { select: { id: true, userName: true } },
        lastLat: true,
        lastLng: true,
        lastLocationAt: true,
        routeBatchId: true,
        routeOrderInSequence: true,
        estimatedDurationSec: true,
      },
    });
    return { ok: true, ts: new Date().toISOString(), count: rows.length, rows };
  }

  async remove(user: RequestUser, id: string, kind: LogisticsKindValue) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx06Dn.findFirst({
        where: { id, tenantId, logisticsType: kind },
        select: { ...DN_SEL },
      });
      if (!existing) throw new NotFoundException('Document not found');
      assertDnStatusTransition(kind, existing.status, 'VOIDED');
      await tx.nx06Dn.update({
        where: { id },
        data: { status: 'VOIDED', updatedBy: user.sub },
      });
      const full = await this.mapDetailTx(tx, tenantId, id, kind);
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'DELETE',
        entityTable: 'nx06_dn',
        entityId: id,
        entityCode: existing.docNo,
        summary: '作廢物流單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return full;
    });
  }
}
