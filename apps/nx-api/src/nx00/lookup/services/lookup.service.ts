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

const ALLOWED_PARTNER_TYPES: PartnerType[] = ['BOTH', 'CUSTOMER', 'SUPPLIER'];

function normalizePartnerType(v: any): PartnerType | undefined {
    if (v === undefined || v === null || String(v).trim() === '') return undefined;
    const s = String(v).trim().toUpperCase();
    if ((ALLOWED_PARTNER_TYPES as string[]).includes(s)) return s as PartnerType;
    throw new BadRequestException(`partnerType must be one of: ${ALLOWED_PARTNER_TYPES.join(', ')}`);
}

@Injectable()
export class LookupService {
    constructor(private readonly prisma: PrismaService) { }

    async brand(isActive?: boolean): Promise<LookupItem[]> {
        return this.prisma.nx00Brand.findMany({
            where: isActive === undefined ? {} : { isActive },
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async warehouse(isActive?: boolean): Promise<LookupItem[]> {
        return this.prisma.nx00Warehouse.findMany({
            where: isActive === undefined ? {} : { isActive },
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async location(params?: { warehouseId?: string; isActive?: boolean }): Promise<LookupLocationItem[]> {
        const where: any = {};
        if (params?.warehouseId) where.warehouseId = params.warehouseId;
        if (params?.isActive !== undefined) where.isActive = params.isActive;

        return this.prisma.nx00Location.findMany({
            where,
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

    async role(isActive?: boolean): Promise<LookupItem[]> {
        return this.prisma.nx00Role.findMany({
            where: isActive === undefined ? {} : { isActive },
            orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
            select: { id: true, code: true, name: true, isActive: true },
        });
    }

    async partner(params?: { partnerType?: string; isActive?: boolean }): Promise<Array<LookupItem & { partnerType: string }>> {
        const where: any = {};
        const pt = normalizePartnerType(params?.partnerType);
        if (pt) where.partnerType = pt;
        if (params?.isActive !== undefined) where.isActive = params.isActive;

        return this.prisma.nx00Partner.findMany({
            where,
            orderBy: [{ code: 'asc' }],
            select: { id: true, code: true, name: true, partnerType: true, isActive: true },
        });
    }
}