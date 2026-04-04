/**
 * File: apps/nx-api/src/nx00/lookup/services/lookup.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOOKUP-SVC-001：Lookup Service（下拉資料來源 / 精簡欄位）
 *
 * Notes:
 * - 只回傳下拉需要欄位（select）
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { LookupItem, LookupLocationItem, PartnerType } from '../dto/lookup.dto';

const ALLOWED_PARTNER_TYPES: PartnerType[] = ['C', 'S', 'T', 'V', 'B', 'BOTH', 'CUST', 'SUP'];

function normalizePartnerType(v: any): PartnerType | undefined {
    if (v === undefined || v === null || String(v).trim() === '') return undefined;
    let s = String(v).trim().toUpperCase();
    if (s === 'CUSTOMER') s = 'CUST';
    if (s === 'SUPPLIER') s = 'SUP';
    if ((ALLOWED_PARTNER_TYPES as string[]).includes(s)) return s as PartnerType;
    throw new BadRequestException(`partnerType must be one of: ${ALLOWED_PARTNER_TYPES.join(', ')}`);
}

export type LookupReadScope = { tenantScopeId?: string | null };

function withTenantWhere(
    scope: LookupReadScope | undefined,
    filters: Record<string, unknown>,
): Record<string, unknown> {
    const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
    if (tid === null) return filters;
    return { ...filters, tenantId: tid };
}

@Injectable()
export class LookupService {
    constructor(private readonly prisma: PrismaService) { }

    async brand(isActive?: boolean, scope?: LookupReadScope): Promise<LookupItem[]> {
        const base = isActive === undefined ? {} : { isActive };
        return this.prisma.nx00PartBrand.findMany({
            where: withTenantWhere(scope, base),
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    /** 汽車廠牌（nx00_car_brand）— 其他主檔／表單下拉用 */
    async carBrand(isActive?: boolean, scope?: LookupReadScope): Promise<LookupItem[]> {
        const base = isActive === undefined ? {} : { isActive };
        return this.prisma.nx00CarBrand.findMany({
            where: withTenantWhere(scope, base),
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async warehouse(isActive?: boolean, scope?: LookupReadScope): Promise<LookupItem[]> {
        const base = isActive === undefined ? {} : { isActive };
        return this.prisma.nx00Warehouse.findMany({
            where: withTenantWhere(scope, base),
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async location(
        params?: { warehouseId?: string; isActive?: boolean },
        scope?: LookupReadScope,
    ): Promise<LookupLocationItem[]> {
        const where: any = {};
        if (params?.warehouseId) where.warehouseId = params.warehouseId;
        if (params?.isActive !== undefined) where.isActive = params.isActive;

        return this.prisma.nx00Location.findMany({
            where: withTenantWhere(scope, where),
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: {
                id: true,
                warehouseId: true,
                code: true,
                name: true,
                zone: true,
                rack: true,
                levelNo: true,
                binNo: true,
                isActive: true,
            },
        });
    }

    async role(isActive?: boolean, scope?: LookupReadScope): Promise<LookupItem[]> {
        const base = isActive === undefined ? {} : { isActive };
        return this.prisma.nx00Role.findMany({
            where: withTenantWhere(scope, base),
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    /**
     * 零件關鍵字搜尋（料號／品名，供開帳存／盤點等 AutoComplete）
     * - q 空字串時回傳 []，避免一次載入全主檔
     */
    async part(
        params?: { q?: string; pageSize?: number; isActive?: boolean },
        scope?: LookupReadScope,
    ): Promise<LookupItem[]> {
        const rawQ = params?.q?.trim() ?? '';
        if (!rawQ) return [];

        const take = Math.min(50, Math.max(1, Number(params?.pageSize) || 20));
        const activeOnly = params?.isActive !== false;
        const base: Record<string, unknown> = activeOnly ? { isActive: true } : {};

        return this.prisma.nx00Part.findMany({
            where: withTenantWhere(scope, {
                ...base,
                OR: [
                    { code: { contains: rawQ, mode: 'insensitive' } },
                    { name: { contains: rawQ, mode: 'insensitive' } },
                ],
            }),
            take,
            orderBy: [{ code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async partner(
        params?: { partnerType?: string; isActive?: boolean },
        scope?: LookupReadScope,
    ): Promise<Array<LookupItem & { partnerType: string }>> {
        const where: any = {};
        const pt = normalizePartnerType(params?.partnerType);
        if (pt) where.partnerType = pt;
        if (params?.isActive !== undefined) where.isActive = params.isActive;

        return this.prisma.nx00Partner.findMany({
            where: withTenantWhere(scope, where),
            orderBy: [{ code: 'asc' }],
            select: { id: true, code: true, name: true, partnerType: true, isActive: true },
        });
    }
}