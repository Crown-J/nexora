// apps/nx-api/src/nx03/part-stock-setting/part-stock-setting.service.ts
// NX03 PartStockSetting service（料件 × 倉 安全量 / 最高量 / 預設庫位 設定）
// 對齊 AUDIT-03 業務語意 + overview §3.3 #12 自動補貨偵測基礎
// schema 註解寫 unique [tenantId, partId, warehouseId] 但未 DDL 落地（A026 backlog）、
// 本 service 層自律：create 前 findFirst 校驗 duplicate → throw ConflictException
//
// NX03-STOCK-LITE M2-F：
//   - defaultLocationId（FK Nx01Location）：進貨上架建議用、新增 endpoint suggestLocation(partId, warehouseId)
//   - safety > max 警示：service 層回 warnings 陣列、不硬擋（LITE 提示型）

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs, type Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreatePartStockSettingDto,
  PartStockSettingListQueryDto,
  UpdatePartStockSettingDto,
} from './dto/part-stock-setting.dto';

const SETTING_SEL = {
  id: true,
  tenantId: true,
  partId: true,
  warehouseId: true,
  minQty: true,
  maxQty: true,
  reorderQty: true,
  // NX03-STOCK-LITE M2-F 新增
  defaultLocationId: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

/** safety > max（且 max > 0）→ 業務不合理、回 warning（不硬擋）。 */
function buildWarnings(minQty: PrismaNs.Decimal, maxQty: PrismaNs.Decimal): string[] {
  const warnings: string[] = [];
  if (maxQty.gt(0) && minQty.gt(maxQty)) {
    warnings.push(
      `安全量 (${minQty.toString()}) 高於最高量 (${maxQty.toString()})、業務不合理；建議調整以利補貨建議正確`,
    );
  }
  return warnings;
}

@Injectable()
export class PartStockSettingService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(
    tenantId: string,
    q: PartStockSettingListQueryDto,
  ): Prisma.Nx03PartStockSettingWhereInput {
    const where: Prisma.Nx03PartStockSettingWhereInput = { tenantId };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.part = {
        OR: [
          { code: { contains: s, mode: 'insensitive' } },
          { name: { contains: s, mode: 'insensitive' } },
        ],
      };
    }
    return where;
  }

  async list(user: RequestUser, q: PartStockSettingListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03PartStockSetting.count({ where }),
      this.prisma.nx03PartStockSetting.findMany({
        where,
        orderBy: [{ warehouseId: 'asc' }, { partId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...SETTING_SEL,
          part: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03PartStockSetting.findFirst({
      where: { id, tenantId },
      select: {
        ...SETTING_SEL,
        part: { select: { code: true, name: true } },
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('PartStockSetting not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePartStockSettingDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    // application-layer unique 自律：[tenantId, partId, warehouseId] 唯一
    const exists = await this.prisma.nx03PartStockSetting.findFirst({
      where: {
        tenantId,
        partId: dto.partId.trim(),
        warehouseId: dto.warehouseId.trim(),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException(
        `PartStockSetting already exists for part=${dto.partId} warehouse=${dto.warehouseId} (id=${exists.id})`,
      );
    }

    // NX03-STOCK-LITE M2-F：defaultLocationId 若帶、需屬同倉
    const defaultLocId = dto.defaultLocationId?.trim() || null;
    if (defaultLocId) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: defaultLocId, tenantId, warehouseId: dto.warehouseId.trim() },
        select: { id: true },
      });
      if (!loc) {
        throw new ConflictException('defaultLocationId 必須屬於同倉庫');
      }
    }

    const row = await this.prisma.nx03PartStockSetting.create({
      data: {
        tenantId,
        partId: dto.partId.trim(),
        warehouseId: dto.warehouseId.trim(),
        minQty: dto.minQty ?? 0,
        maxQty: dto.maxQty ?? 0,
        reorderQty: dto.reorderQty ?? 0,
        defaultLocationId: defaultLocId,
        isActive: dto.isActive ?? true,
        remark: dto.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
      select: SETTING_SEL,
    });
    const warnings = buildWarnings(new PrismaNs.Decimal(row.minQty), new PrismaNs.Decimal(row.maxQty));
    return { ...row, warnings };
  }

  async update(user: RequestUser, id: string, dto: UpdatePartStockSettingDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const existing = await this.prisma.nx03PartStockSetting.findFirst({
      where: { id, tenantId },
      select: { id: true, warehouseId: true, minQty: true, maxQty: true },
    });
    if (!existing) throw new NotFoundException('PartStockSetting not found');

    // NX03-STOCK-LITE M2-F：若 update defaultLocationId、校驗屬同倉
    if (dto.defaultLocationId !== undefined && dto.defaultLocationId.trim()) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: {
          id: dto.defaultLocationId.trim(),
          tenantId,
          warehouseId: existing.warehouseId,
        },
        select: { id: true },
      });
      if (!loc) {
        throw new ConflictException('defaultLocationId 必須屬於同倉庫');
      }
    }

    const data: Prisma.Nx03PartStockSettingUpdateInput = { updatedBy: userId };
    if (dto.minQty !== undefined) data.minQty = dto.minQty;
    if (dto.maxQty !== undefined) data.maxQty = dto.maxQty;
    if (dto.reorderQty !== undefined) data.reorderQty = dto.reorderQty;
    if (dto.defaultLocationId !== undefined) {
      const v = dto.defaultLocationId.trim();
      data.defaultLocation = v ? { connect: { id: v } } : { disconnect: true };
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.remark !== undefined) data.remark = dto.remark?.trim() || null;

    const row = await this.prisma.nx03PartStockSetting.update({
      where: { id },
      data,
      select: SETTING_SEL,
    });
    const warnings = buildWarnings(new PrismaNs.Decimal(row.minQty), new PrismaNs.Decimal(row.maxQty));
    return { ...row, warnings };
  }

  /**
   * NX03-STOCK-LITE M2-F：進貨上架建議
   *   - 給定 partId + warehouseId、回 PartStockSetting.defaultLocationId（若 isActive 且有設）
   *   - UI 在進貨建單時可呼叫此 endpoint pre-fill 庫位、減少倉管手動選
   *   - null = 該料件該倉未設 default、UI 提示倉管選一個
   */
  async suggestLocation(user: RequestUser, partId: string, warehouseId: string) {
    const tenantId = requireTenantId(user);
    const setting = await this.prisma.nx03PartStockSetting.findFirst({
      where: {
        tenantId,
        partId: partId.trim(),
        warehouseId: warehouseId.trim(),
        isActive: true,
      },
      select: {
        defaultLocationId: true,
        defaultLocation: { select: { id: true, code: true, name: true, zone: true, isActive: true } },
      },
    });
    if (!setting?.defaultLocationId || !setting.defaultLocation?.isActive) {
      return { defaultLocationId: null, defaultLocation: null };
    }
    return {
      defaultLocationId: setting.defaultLocationId,
      defaultLocation: setting.defaultLocation,
    };
  }
}
