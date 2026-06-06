// apps/nx-api/src/nx09/vin-lookup/nx09-vin-lookup.service.ts
// NX09 VinLookup service（VIN 17 碼 + NHTSA decode + 手動建檔 + Parts 查詢）
//
// 對齊：overview v0.2.0 §5 + plan v0.1.0 §2.L3 + Crown Q1=c
// 業界改革 ⭐⭐⭐：業界中小汽配 ERP 多無 VIN 對照、NEXORA 第一個

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCarBrandRefs } from '../../shared/nx01/resolve-brand-refs';
import { decodeVinFromNhtsa } from '../../shared/nx09/nx09-nhtsa-client';

import type {
  CreateVinLookupManualDto,
  DecodeVinDto,
  PatchVinLookupDto,
} from './dto/vin-lookup.dto';

@Injectable()
export class Nx09VinLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 列租戶下 VinLookup（依 source / isActive filter）。 */
  async listMine(user: RequestUser, query?: { source?: string; isActive?: boolean }) {
    const tenantId = requireTenantId(user);
    const where: Record<string, unknown> = { tenantId };
    if (query?.source) where.source = query.source;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    const rows = await this.prisma.nx09VinLookup.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        brand: { select: { id: true, code: true, name: true, nameEn: true } },
        model: { select: { id: true, code: true, name: true, modelYearFrom: true, modelYearTo: true } },
      },
    });
    return { ok: true, count: rows.length, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09VinLookup.findFirst({
      where: { id: id.trim(), tenantId },
      include: {
        brand: { select: { id: true, code: true, name: true, nameEn: true } },
        model: { select: { id: true, code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('VinLookup not found');
    return { ok: true, row };
  }

  async getByVin(user: RequestUser, vin: string) {
    const tenantId = requireTenantId(user);
    const clean = vin.trim().toUpperCase();
    if (clean.length !== 17) throw new BadRequestException('VIN must be 17 chars');
    const row = await this.prisma.nx09VinLookup.findFirst({
      where: { tenantId, vin: clean },
      include: {
        brand: { select: { id: true, code: true, name: true, nameEn: true } },
        model: { select: { id: true, code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('VIN not found in lookup table');
    return { ok: true, row };
  }

  /**
   * NHTSA decode + upsert VinLookup（業界改革核心、業界中小汽配 ERP 第一個）。
   * 範式：
   *   1. 先查既有 VinLookup（同 tenant + 同 VIN）
   *   2. call NHTSA vPIC decode
   *   3. 嘗試對應 carBrand（NHTSA Make case-insensitive vs Nx01CarBrand.nameEn）
   *   4. upsert：既有則 patch source='API'+decode 結果、無則 insert
   *   5. NHTSA 失敗 → source='MANUAL' + null fields + log warn
   */
  async decodeFromNhtsa(user: RequestUser, dto: DecodeVinDto) {
    const tenantId = requireTenantId(user);
    const cleanVin = dto.vin.trim().toUpperCase();
    if (cleanVin.length !== 17) throw new BadRequestException('VIN must be 17 chars');

    const decoded = await decodeVinFromNhtsa(cleanVin);

    // 對應品牌（NHTSA Make case-insensitive vs nx01_brand.nameEn、isCar=true）
    // W6-Phase 5 2026-06-06：舊 nx01_car_brand 已 drop、單表查
    let brandId: string | null = null;
    if (decoded.make) {
      const nb = await this.prisma.nx01Brand.findFirst({
        where: {
          tenantId,
          isActive: true,
          isCar: true,
          nameEn: { equals: decoded.make, mode: 'insensitive' },
        },
        select: { id: true },
      });
      brandId = nb?.id ?? null;
    }

    const existing = await this.prisma.nx09VinLookup.findFirst({
      where: { tenantId, vin: cleanVin },
      select: { id: true },
    });

    const payload = {
      source: decoded.ok ? 'API' : 'MANUAL',
      decodedAt: decoded.ok ? new Date() : null,
      rawApiResponse: decoded.rawResponse ? JSON.stringify(decoded.rawResponse).slice(0, 50000) : null,
      brandId,
      notes: dto.notes?.trim() ?? null,
      updatedBy: user.sub,
    };

    let row;
    if (existing) {
      row = await this.prisma.nx09VinLookup.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      row = await this.prisma.nx09VinLookup.create({
        data: {
          tenantId,
          vin: cleanVin,
          ...payload,
          createdBy: user.sub,
        },
      });
    }

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: existing ? 'UPDATE' : 'CREATE',
      entityTable: 'nx09_vin_lookup',
      entityId: row.id,
      summary: `VIN decode ${decoded.ok ? 'API' : 'MANUAL fallback'}：${cleanVin} → make=${decoded.make ?? 'null'} model=${decoded.model ?? 'null'} year=${decoded.modelYear ?? 'null'}`,
      afterData: { vin: cleanVin, decoded, brandId } as object,
    });

    return {
      ok: true,
      decoded,
      row,
      message: decoded.ok
        ? `NHTSA decode 成功（make=${decoded.make}, model=${decoded.model}, year=${decoded.modelYear}）`
        : `NHTSA 查不到（${decoded.errorReason}）、source='MANUAL' fallback、業務員可後補 modelId`,
    };
  }

  /** 業務員手動建檔 VinLookup（source='MANUAL'）。 */
  async upsertManual(user: RequestUser, dto: CreateVinLookupManualDto) {
    const tenantId = requireTenantId(user);
    const cleanVin = dto.vin.trim().toUpperCase();
    if (cleanVin.length !== 17) throw new BadRequestException('VIN must be 17 chars');

    // 對應 brand / model 校驗
    // W6-Phase 5：dto.carBrandId 為 brand.id（picker 已切）
    const manualRefs = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
    if (dto.carBrandId && !manualRefs.brandId) {
      throw new BadRequestException('carBrandId invalid or inactive');
    }
    if (dto.modelId) {
      const m = await this.prisma.nx01Model.findFirst({
        where: { id: dto.modelId.trim(), tenantId, isActive: true },
        select: { id: true },
      });
      if (!m) throw new BadRequestException('modelId invalid or inactive');
    }

    const existing = await this.prisma.nx09VinLookup.findFirst({
      where: { tenantId, vin: cleanVin },
      select: { id: true },
    });

    const payload = {
      brandId: manualRefs.brandId,
      modelId: dto.modelId?.trim() ?? null,
      source: 'MANUAL',
      notes: dto.notes?.trim() ?? null,
      updatedBy: user.sub,
    };

    if (existing) {
      const updated = await this.prisma.nx09VinLookup.update({
        where: { id: existing.id },
        data: payload,
      });
      return { ok: true, row: updated, mode: 'updated' };
    }
    const created = await this.prisma.nx09VinLookup.create({
      data: { tenantId, vin: cleanVin, ...payload, createdBy: user.sub },
    });
    return { ok: true, row: created, mode: 'created' };
  }

  async patch(user: RequestUser, id: string, dto: PatchVinLookupDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09VinLookup.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('VinLookup not found');

    // W6-Phase 5：dto.carBrandId 為 brand.id
    let patchRefs: { brandId: string | null } | null = null;
    if (dto.carBrandId !== undefined) {
      patchRefs = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
      if (dto.carBrandId && !patchRefs.brandId) {
        throw new BadRequestException('carBrandId invalid');
      }
    }
    if (dto.modelId !== undefined && dto.modelId) {
      const m = await this.prisma.nx01Model.findFirst({
        where: { id: dto.modelId.trim(), tenantId, isActive: true },
        select: { id: true },
      });
      if (!m) throw new BadRequestException('modelId invalid');
    }

    const updated = await this.prisma.nx09VinLookup.update({
      where: { id: existing.id },
      data: {
        ...(patchRefs ? { brandId: patchRefs.brandId } : {}),
        ...(dto.modelId !== undefined ? { modelId: dto.modelId?.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ?? null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async delete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09VinLookup.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('VinLookup not found');
    await this.prisma.nx09VinLookup.delete({ where: { id: existing.id } });
    return { ok: true, deletedId: existing.id };
  }

  /**
   * VIN → modelId → PartModel → parts 列表（業界改革核心 query）。
   * 純讀、不寫、不依賴 NHTSA。
   */
  async listPartsByVinLookup(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const vinRow = await this.prisma.nx09VinLookup.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true, vin: true, modelId: true },
    });
    if (!vinRow) throw new NotFoundException('VinLookup not found');
    if (!vinRow.modelId) {
      return {
        ok: true,
        vin: vinRow.vin,
        modelId: null,
        count: 0,
        rows: [],
        message: 'VinLookup 尚未關聯 modelId、無法查 parts。業務員可走 patch endpoint 補 modelId',
      };
    }
    const partModels = await this.prisma.nx01PartModel.findMany({
      where: { tenantId, modelId: vinRow.modelId, isActive: true },
      orderBy: [{ fitLevel: 'asc' }, { sortNo: 'asc' }],
      take: 200,
      include: {
        part: { select: { id: true, code: true, name: true } },
      },
    });
    return {
      ok: true,
      vin: vinRow.vin,
      modelId: vinRow.modelId,
      count: partModels.length,
      rows: partModels,
    };
  }
}
