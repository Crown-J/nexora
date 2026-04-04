/**
 * File: apps/nx-api/src/nx00/part/services/part.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-SVC-001：Part Service（CRUD + audit user username/displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_part_id()
 * - @@unique([tenantId, code, countryId]) — 同租戶同料號同產地唯一
 * - codeRuleId 必填；partBrandId 可為 null；寫入前檢查 FK
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreatePartBody,
    ListPartQuery,
    PagedResult,
    PartDto,
    SetActiveBody,
    UpdatePartBody,
} from '../dto/part.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

const ALLOWED_PART_TYPE = new Set(['A', 'B', 'C', 'D']);

function resolvePartTypeForWrite(v: unknown): string | null {
    if (v === undefined || v === null) return null;
    const s = String(v).trim().toUpperCase();
    if (s === '') return null;
    if (!ALLOWED_PART_TYPE.has(s)) {
        throw new BadRequestException('partType must be A, B, C, D or empty');
    }
    return s;
}

type PartRowWithAudit = {
    id: string;
    codeRuleId: string;
    code: string;
    name: string;
    partBrandId: string | null;
    isOem: boolean;
    partType: string | null;
    secCode: string | null;
    seg1: string | null;
    seg2: string | null;
    seg3: string | null;
    seg4: string | null;
    seg5: string | null;
    countryId: string | null;
    partGroupId: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { userAccount: string; userName: string } | null;
    updatedByUser?: { userAccount: string; userName: string } | null;

    partBrand?: { code?: string | null; name?: string | null } | null;
    codeRule?: { name?: string | null } | null;
    country?: { code?: string | null; name?: string | null } | null;
    partGroup?: { code?: string | null; name?: string | null } | null;
};

function toPartDto(row: PartRowWithAudit): PartDto {
    return {
        id: row.id,
        codeRuleId: row.codeRuleId,
        codeRuleName: row.codeRule?.name ?? null,
        code: row.code,
        name: row.name,

        partBrandId: row.partBrandId ?? null,
        brandCode: row.partBrand?.code ?? null,
        brandName: row.partBrand?.name ?? null,

        isOem: Boolean(row.isOem),
        partType: row.partType ?? null,

        secCode: row.secCode ?? null,
        seg1: row.seg1 ?? null,
        seg2: row.seg2 ?? null,
        seg3: row.seg3 ?? null,
        seg4: row.seg4 ?? null,
        seg5: row.seg5 ?? null,
        countryId: row.countryId ?? null,
        countryCode: row.country?.code ?? null,
        countryName: row.country?.name ?? null,

        partGroupId: row.partGroupId ?? null,
        partGroupCode: row.partGroup?.code ?? null,
        partGroupName: row.partGroup?.name ?? null,

        spec: row.spec ?? null,
        uom: row.uom,
        isActive: Boolean(row.isActive),

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByUsername: row.createdByUser?.userAccount ?? null,
        createdByName: row.createdByUser?.userName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByUsername: row.updatedByUser?.userAccount ?? null,
        updatedByName: row.updatedByUser?.userName ?? null,
    };
}

function snapshotPartForAudit(row: {
    id: string;
    codeRuleId: string;
    code: string;
    name: string;
    partBrandId: string | null;
    isOem: boolean;
    partType: string | null;
    secCode: string | null;
    seg1: string | null;
    seg2: string | null;
    seg3: string | null;
    seg4: string | null;
    seg5: string | null;
    countryId: string | null;
    partGroupId: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;
}) {
    return {
        id: row.id,
        codeRuleId: row.codeRuleId,
        code: row.code,
        name: row.name,
        partBrandId: row.partBrandId ?? null,
        isOem: Boolean(row.isOem),
        partType: row.partType ?? null,
        secCode: row.secCode ?? null,
        seg1: row.seg1 ?? null,
        seg2: row.seg2 ?? null,
        seg3: row.seg3 ?? null,
        seg4: row.seg4 ?? null,
        seg5: row.seg5 ?? null,
        countryId: row.countryId ?? null,
        partGroupId: row.partGroupId ?? null,
        spec: row.spec ?? null,
        uom: row.uom,
        isActive: Boolean(row.isActive),
    };
}

/**
 * Part Action Context（用於 AuditLog）
 */
export type PartActionContext = {
    actorUserId?: string;
    tenantId?: string | null;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class PartService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    private async assertCountryId(countryId: string | null | undefined): Promise<void> {
        if (!countryId) return;
        const c = await this.prisma.nx00Country.findUnique({ where: { id: countryId }, select: { id: true } });
        if (!c) throw new BadRequestException('Country not found');
    }

    private async assertPartGroupId(partGroupId: string | null | undefined, tenantId: string): Promise<void> {
        if (!partGroupId) return;
        const g = await this.prisma.nx00PartGroup.findUnique({
            where: { id: partGroupId },
            select: { id: true, tenantId: true },
        });
        if (!g) throw new BadRequestException('Part group not found');
        if (g.tenantId !== tenantId) throw new BadRequestException('Part group tenant mismatch');
    }

    private async assertCodeRuleId(codeRuleId: string | null | undefined, tenantId: string): Promise<void> {
        const id = codeRuleId?.trim();
        if (!id) throw new BadRequestException('codeRuleId is required');
        const r = await this.prisma.nx00BrandCodeRule.findUnique({
            where: { id },
            select: { id: true, tenantId: true },
        });
        if (!r) throw new BadRequestException('Code rule not found');
        if (r.tenantId !== tenantId) throw new BadRequestException('Code rule tenant mismatch');
    }

    private partInclude() {
        return {
            codeRule: { select: { name: true } },
            partBrand: { select: { code: true, name: true } },
            country: { select: { code: true, name: true } },
            partGroup: { select: { code: true, name: true } },
            createdByUser: { select: { userAccount: true, userName: true } },
            updatedByUser: { select: { userAccount: true, userName: true } },
        } as const;
    }

    async list(query: ListPartQuery): Promise<PagedResult<PartDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { spec: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (query.partBrandId) where.partBrandId = query.partBrandId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Part.count({ where }),
            this.prisma.nx00Part.findMany({
                where,
                orderBy: [{ code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.partInclude(),
            }),
        ]);

        return {
            items: (rows as unknown as PartRowWithAudit[]).map(toPartDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<PartDto> {
        const row = await this.prisma.nx00Part.findUnique({
            where: { id },
            include: this.partInclude(),
        });
        if (!row) throw new NotFoundException('Part not found');
        return toPartDto(row as unknown as PartRowWithAudit);
    }

    async create(body: CreatePartBody, ctx?: PartActionContext): Promise<PartDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        const uom = (body.uom ?? 'pcs').trim() || 'pcs';
        const partTypeResolved = resolvePartTypeForWrite(body.partType);

        let tenantId: string | null = null;
        const brandId = body.partBrandId?.trim() || null;
        if (brandId) {
            const b = await this.prisma.nx00PartBrand.findUnique({
                where: { id: brandId },
                select: { id: true, tenantId: true },
            });
            if (!b) throw new BadRequestException('Brand not found');
            tenantId = b.tenantId;
        } else {
            tenantId =
                (typeof body.tenantId === 'string' && body.tenantId.trim() !== '' ? body.tenantId.trim() : null) ??
                ctx?.tenantId ??
                null;
        }
        if (!tenantId) throw new BadRequestException('tenantId is required (set partBrandId or tenantId)');

        await this.assertCodeRuleId(body.codeRuleId, tenantId);
        await this.assertCountryId(body.countryId ?? null);
        await this.assertPartGroupId(body.partGroupId ?? null, tenantId);

        const trimSeg = (v: unknown) => {
            if (v === undefined || v === null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };

        try {
            const row = await this.prisma.nx00Part.create({
                data: {
                    tenantId,
                    codeRuleId: body.codeRuleId!.trim(),
                    code,
                    name,
                    partBrandId: body.partBrandId ?? null,
                    isOem: body.isOem ?? true,
                    ...(partTypeResolved != null ? { partType: partTypeResolved } : {}),
                    secCode: trimSeg(body.secCode),
                    seg1: trimSeg(body.seg1),
                    seg2: trimSeg(body.seg2),
                    seg3: trimSeg(body.seg3),
                    seg4: trimSeg(body.seg4),
                    seg5: trimSeg(body.seg5),
                    countryId: body.countryId ?? null,
                    partGroupId: body.partGroupId ?? null,
                    spec: body.spec ?? null,
                    uom,
                    isActive: body.isActive ?? true,

                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: this.partInclude(),
            });

            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    tenantId: row.tenantId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_part',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create part ${row.code}`,
                    beforeData: null,
                    afterData: snapshotPartForAudit(row),
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toPartDto(row as unknown as PartRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('同租戶、同料號、同產地之組合已存在');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdatePartBody, ctx?: PartActionContext): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({
            where: { id },
            select: {
                id: true,
                tenantId: true,
                codeRuleId: true,
                code: true,
                name: true,
                partBrandId: true,
                isOem: true,
                partType: true,
                secCode: true,
                seg1: true,
                seg2: true,
                seg3: true,
                seg4: true,
                seg5: true,
                countryId: true,
                partGroupId: true,
                spec: true,
                uom: true,
                isActive: true,
            },
        });
        if (!exists) throw new NotFoundException('Part not found');

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        const trimSeg = (v: unknown) => {
            if (v === undefined) return undefined;
            if (v === null) return null;
            const s = String(v).trim();
            return s === '' ? null : s;
        };

        if (body.codeRuleId !== undefined) {
            await this.assertCodeRuleId(body.codeRuleId, exists.tenantId);
            data.codeRuleId = body.codeRuleId.trim();
        }
        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.partBrandId !== undefined) data.partBrandId = body.partBrandId ?? null;
        if (typeof body.isOem === 'boolean') data.isOem = body.isOem;
        if (body.partType !== undefined) {
            const pt = resolvePartTypeForWrite(body.partType);
            data.partType = pt ?? 'A';
        }
        if (body.secCode !== undefined) data.secCode = trimSeg(body.secCode);
        if (body.seg1 !== undefined) data.seg1 = trimSeg(body.seg1);
        if (body.seg2 !== undefined) data.seg2 = trimSeg(body.seg2);
        if (body.seg3 !== undefined) data.seg3 = trimSeg(body.seg3);
        if (body.seg4 !== undefined) data.seg4 = trimSeg(body.seg4);
        if (body.seg5 !== undefined) data.seg5 = trimSeg(body.seg5);
        if (body.countryId !== undefined) data.countryId = body.countryId ?? null;
        if (body.partGroupId !== undefined) data.partGroupId = body.partGroupId ?? null;
        if (body.spec !== undefined) data.spec = body.spec ?? null;
        if (typeof body.uom === 'string') data.uom = body.uom.trim() || 'pcs';
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        if (data.partBrandId) {
            const b = await this.prisma.nx00PartBrand.findUnique({
                where: { id: data.partBrandId },
                select: { id: true, tenantId: true },
            });
            if (!b) throw new BadRequestException('Brand not found');
            if (b.tenantId !== exists.tenantId) throw new BadRequestException('Brand tenant mismatch');
        }
        if (data.countryId !== undefined) {
            await this.assertCountryId(data.countryId ?? null);
        }
        if (data.partGroupId !== undefined) {
            await this.assertPartGroupId(data.partGroupId ?? null, exists.tenantId);
        }

        try {
            const row = await this.prisma.nx00Part.update({
                where: { id },
                data,
                include: this.partInclude(),
            });

            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    tenantId: row.tenantId,
                    moduleCode: 'NX00',
                    action: 'UPDATE',
                    entityTable: 'nx00_part',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update part ${row.code}`,
                    beforeData: snapshotPartForAudit(exists),
                    afterData: snapshotPartForAudit(row),
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toPartDto(row as unknown as PartRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('同租戶、同料號、同產地之組合已存在');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: PartActionContext): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({
            where: { id },
            select: { id: true, tenantId: true, code: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Part not found');

        const row = await this.prisma.nx00Part.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: this.partInclude(),
        });

        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                tenantId: row.tenantId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_part',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set part ${row.code} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toPartDto(row as unknown as PartRowWithAudit);
    }
}
