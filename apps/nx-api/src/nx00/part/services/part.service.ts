/**
 * File: apps/nx-api/src/nx00/part/services/part.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-SVC-001：Part Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_part_id()
 * - @@unique([code, carBrandId]) — 同 car_brand_id 下 code 不可重複
 * - partBrandId / carBrandId 可為 null；寫入前檢查 FK
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
    code: string;
    name: string;
    partBrandId: string | null;
    isOem: boolean;
    carBrandId: string | null;
    partType: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;

    partBrand?: { code?: string | null; name?: string | null } | null;
    carBrand?: { code?: string | null; name?: string | null } | null;
};

function toPartDto(row: PartRowWithAudit): PartDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,

        partBrandId: row.partBrandId ?? null,
        brandCode: row.partBrand?.code ?? null,
        brandName: row.partBrand?.name ?? null,

        isOem: Boolean(row.isOem),
        carBrandId: row.carBrandId ?? null,
        carBrandCode: row.carBrand?.code ?? null,
        carBrandName: row.carBrand?.name ?? null,
        partType: row.partType ?? null,

        spec: row.spec ?? null,
        uom: row.uom,
        isActive: Boolean(row.isActive),

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

function snapshotPartForAudit(row: {
    id: string;
    code: string;
    name: string;
    partBrandId: string | null;
    isOem: boolean;
    carBrandId: string | null;
    partType: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;
}) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        partBrandId: row.partBrandId ?? null,
        isOem: Boolean(row.isOem),
        carBrandId: row.carBrandId ?? null,
        partType: row.partType ?? null,
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
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class PartService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    private async assertCarBrandId(carBrandId: string | null | undefined): Promise<void> {
        if (!carBrandId) return;
        const c = await this.prisma.nx00CarBrand.findUnique({ where: { id: carBrandId }, select: { id: true } });
        if (!c) throw new BadRequestException('Car brand not found');
    }

    private partInclude() {
        return {
            partBrand: { select: { code: true, name: true } },
            carBrand: { select: { code: true, name: true } },
            createdByUser: { select: { displayName: true } },
            updatedByUser: { select: { displayName: true } },
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
        if (query.carBrandId) where.carBrandId = query.carBrandId;
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
        const partType = resolvePartTypeForWrite(body.partType);

        if (body.partBrandId) {
            const b = await this.prisma.nx00PartBrand.findUnique({ where: { id: body.partBrandId }, select: { id: true } });
            if (!b) throw new BadRequestException('Brand not found');
        }
        await this.assertCarBrandId(body.carBrandId ?? null);

        try {
            const row = await this.prisma.nx00Part.create({
                data: {
                    code,
                    name,
                    partBrandId: body.partBrandId ?? null,
                    isOem: body.isOem ?? true,
                    carBrandId: body.carBrandId ?? null,
                    partType,
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
                throw new BadRequestException('料號與汽車廠牌組合已存在，請調整 code 或 carBrandId');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdatePartBody, ctx?: PartActionContext): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                name: true,
                partBrandId: true,
                isOem: true,
                carBrandId: true,
                partType: true,
                spec: true,
                uom: true,
                isActive: true,
            },
        });
        if (!exists) throw new NotFoundException('Part not found');

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.partBrandId !== undefined) data.partBrandId = body.partBrandId ?? null;
        if (typeof body.isOem === 'boolean') data.isOem = body.isOem;
        if (body.carBrandId !== undefined) data.carBrandId = body.carBrandId ?? null;
        if (body.partType !== undefined) data.partType = resolvePartTypeForWrite(body.partType);
        if (body.spec !== undefined) data.spec = body.spec ?? null;
        if (typeof body.uom === 'string') data.uom = body.uom.trim() || 'pcs';
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        if (data.partBrandId) {
            const b = await this.prisma.nx00PartBrand.findUnique({ where: { id: data.partBrandId }, select: { id: true } });
            if (!b) throw new BadRequestException('Brand not found');
        }
        if (data.carBrandId !== undefined) {
            await this.assertCarBrandId(data.carBrandId ?? null);
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
                throw new BadRequestException('料號與汽車廠牌組合已存在，請調整 code 或 carBrandId');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: PartActionContext): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({
            where: { id },
            select: { id: true, code: true, isActive: true },
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
