// apps/nx-api/src/nx03/parcel/parcel.service.ts
// NX03 Parcel service（包裹、三選一分流校驗）
// 對齊 overview §5.4 自取(P) / 寄貨(C) / 配送(D) / 調撥(T)
// 配送 D：產生 Nx06Dn 由 NX06 物流模組接管（本 service 不建 DN、純記錄 Parcel）

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
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import { PlStatus } from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateParcelDto, UpdateParcelDto } from './dto/parcel.dto';

const PARCEL_SEL = {
  id: true,
  tenantId: true,
  plId: true,
  parcelNo: true,
  parcelType: true,
  fromWarehouseId: true,
  toWarehouseId: true,
  toPartnerId: true,
  logisticsTrackingNo: true,
  weightKg: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class ParcelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03ParcelWhereInput {
    const where: Prisma.Nx03ParcelWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { parcelNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /** 三選一分流校驗（DTO IsIn 已校 type、本層校語意一致性）。 */
  private assertTriageConsistency(
    parcelType: 'D' | 'P' | 'C' | 'T',
    dto: CreateParcelDto,
  ) {
    switch (parcelType) {
      case 'P': // 自取：客戶到場取貨
        if (dto.toWarehouseId) throw new BadRequestException('parcelType=P 自取: toWarehouseId 必空');
        if (dto.toPartnerId) throw new BadRequestException('parcelType=P 自取: toPartnerId 必空');
        if (dto.logisticsTrackingNo) {
          throw new BadRequestException('parcelType=P 自取: logisticsTrackingNo 必空（無第三方物流）');
        }
        break;
      case 'C': // 寄貨：第三方物流（partner_type=T 物流外包）
        if (!dto.toPartnerId) {
          throw new BadRequestException('parcelType=C 寄貨: toPartnerId 必填（partner_type=T 物流外包）');
        }
        if (dto.toWarehouseId) throw new BadRequestException('parcelType=C 寄貨: toWarehouseId 必空');
        break;
      case 'D': // 配送：公司司機（後續 NX06 DN 接管）
        if (dto.toWarehouseId) throw new BadRequestException('parcelType=D 配送: toWarehouseId 必空');
        // toPartnerId 可選（公司司機未必有 partner 記錄）
        break;
      case 'T': // 調撥：跨倉移動
        if (!dto.toWarehouseId) throw new BadRequestException('parcelType=T 調撥: toWarehouseId 必填');
        if (dto.toPartnerId) throw new BadRequestException('parcelType=T 調撥: toPartnerId 必空');
        break;
    }
  }

  /** 生成 BX 編號（BX-YYYYMM-倉碼-NNNNN、tenant + warehouseCode 範圍流水）。 */
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
      const parts = last.parcelNo.split('-');
      const tail = parts[parts.length - 1];
      const num = parseInt(tail, 10);
      if (!Number.isNaN(num)) next = num + 1;
    }
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Parcel.count({ where }),
      this.prisma.nx03Parcel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: PARCEL_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Parcel.findFirst({
      where: { id, tenantId },
      select: PARCEL_SEL,
    });
    if (!row) throw new NotFoundException('Parcel not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateParcelDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // 校驗 Pl 存在 + 狀態（P/C/F 可建包裹、S/V 已寄出或作廢不可）
      const pl = await tx.nx03Pl.findFirst({
        where: { id: dto.plId.trim(), tenantId },
        select: {
          id: true,
          status: true,
          plType: true,
          warehouseId: true,
          warehouse: { select: { code: true } },
        },
      });
      if (!pl) throw new BadRequestException('plId invalid');
      if (pl.status === PlStatus.SHIPPED || pl.status === PlStatus.VOIDED) {
        throw new BadRequestException(`Pl status '${pl.status}' cannot accept new parcels`);
      }
      if (pl.plType !== dto.parcelType) {
        throw new BadRequestException(
          `parcelType '${dto.parcelType}' must match pl.plType '${pl.plType}'`,
        );
      }
      this.assertTriageConsistency(dto.parcelType, dto);

      // 校驗 toPartnerId 必須 partnerType 含 'T'（寄貨時、application 自律）
      if (dto.parcelType === 'C' && dto.toPartnerId) {
        const partner = await tx.nx01Partner.findFirst({
          where: { id: dto.toPartnerId.trim(), tenantId },
          select: { id: true, partnerType: true },
        });
        if (!partner) throw new BadRequestException('toPartnerId not found in tenant');
        if (!partner.partnerType?.includes('T')) {
          throw new BadRequestException(
            `parcelType=C 寄貨: toPartnerId partnerType must contain 'T' (物流外包)、got '${partner.partnerType}'`,
          );
        }
      }
      // 校驗 toWarehouseId 必須 tenant 內（調撥時）
      if (dto.parcelType === 'T' && dto.toWarehouseId) {
        const toWh = await tx.nx01Warehouse.findFirst({
          where: { id: dto.toWarehouseId.trim(), tenantId },
          select: { id: true },
        });
        if (!toWh) throw new BadRequestException('toWarehouseId not found in tenant');
      }

      const parcelNo = await this.allocParcelNo(tx, tenantId, pl.warehouse.code);
      const parcel = await tx.nx03Parcel.create({
        data: {
          tenantId,
          plId: pl.id,
          parcelNo,
          parcelType: dto.parcelType,
          fromWarehouseId: pl.warehouseId,
          toWarehouseId: dto.toWarehouseId?.trim() || null,
          toPartnerId: dto.toPartnerId?.trim() || null,
          logisticsTrackingNo: dto.logisticsTrackingNo?.trim() || null,
          weightKg: dto.weightKg != null ? new PrismaNs.Decimal(dto.weightKg) : null,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PARCEL_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_parcel',
        entityId: parcel.id,
        entityCode: parcel.parcelNo,
        summary: `建立包裹（type=${dto.parcelType}）`,
        afterData: parcel as object,
      });
      return parcel;
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateParcelDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Parcel.findFirst({
      where: { id, tenantId },
      select: PARCEL_SEL,
    });
    if (!existing) throw new NotFoundException('Parcel not found');
    const row = await this.prisma.nx03Parcel.update({
      where: { id },
      data: {
        ...(dto.logisticsTrackingNo !== undefined ? { logisticsTrackingNo: dto.logisticsTrackingNo } : {}),
        ...(dto.weightKg !== undefined
          ? { weightKg: dto.weightKg != null ? new PrismaNs.Decimal(dto.weightKg) : null }
          : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: PARCEL_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_parcel',
      entityId: id,
      entityCode: existing.parcelNo,
      summary: '修改包裹',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Parcel.findFirst({
      where: { id, tenantId },
      select: PARCEL_SEL,
    });
    if (!existing) throw new NotFoundException('Parcel not found');
    // 校驗：是否有 PlItem 引用此 parcelId、有則不可刪
    const refCount = await this.prisma.nx03PlItem.count({
      where: { parcelId: id },
    });
    if (refCount > 0) {
      throw new BadRequestException(
        `Cannot delete parcel: ${refCount} pl_items still reference this parcelId`,
      );
    }
    // 校驗：是否有 DnItem 引用（NX06 配送已產生）
    const dnRefCount = await this.prisma.nx06DnItem.count({
      where: { parcelId: id },
    });
    if (dnRefCount > 0) {
      throw new BadRequestException(
        `Cannot delete parcel: ${dnRefCount} nx06_dn_items still reference this parcelId`,
      );
    }
    await this.prisma.nx03Parcel.delete({ where: { id } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_parcel',
      entityId: id,
      entityCode: existing.parcelNo,
      summary: '刪除包裹',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}
