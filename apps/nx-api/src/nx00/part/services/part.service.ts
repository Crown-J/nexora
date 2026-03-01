/**
 * File: apps/nx-api/src/nx00/part/services/part.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-SVC-001：Part Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_part_id()
 * - code UNIQUE（P2002）
 * - brandId 可為 null
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    CreatePartBody,
    ListPartQuery,
    PagedResult,
    PartDto,
    SetActiveBody,
    UpdatePartBody,
} from '../dto/part.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type PartRowWithAudit = {
    id: string;
    code: string;
    name: string;
    brandId: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;

    // brand 欄位名稱先假設 code/name（之後可依 brand model 調整）
    brand?: { code?: string | null; name?: string | null } | null;
};

function toPartDto(row: PartRowWithAudit): PartDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,

        brandId: row.brandId ?? null,
        brandCode: (row.brand as any)?.code ?? null,
        brandName: (row.brand as any)?.name ?? null,

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

@Injectable()
export class PartService {
    constructor(private readonly prisma: PrismaService) { }

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
        if (query.brandId) where.brandId = query.brandId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Part.count({ where }),
            this.prisma.nx00Part.findMany({
                where,
                orderBy: [{ code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    brand: { select: { code: true, name: true } } as any,
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
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
            include: {
                brand: { select: { code: true, name: true } } as any,
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Part not found');
        return toPartDto(row as unknown as PartRowWithAudit);
    }

    async create(body: CreatePartBody, actorUserId?: string): Promise<PartDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        const uom = (body.uom ?? 'pcs').trim() || 'pcs';

        // brandId 若有填，先確認存在（避免 FK 噴 500）
        if (body.brandId) {
            const b = await this.prisma.nx00Brand.findUnique({ where: { id: body.brandId }, select: { id: true } });
            if (!b) throw new BadRequestException('Brand not found');
        }

        try {
            const row = await this.prisma.nx00Part.create({
                data: {
                    // id 交給 DB default：gen_nx00_part_id()
                    code,
                    name,
                    brandId: body.brandId ?? null,
                    spec: body.spec ?? null,
                    uom,
                    isActive: body.isActive ?? true,

                    createdBy: actorUserId ?? null,
                    updatedBy: actorUserId ?? null,
                },
                include: {
                    brand: { select: { code: true, name: true } } as any,
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toPartDto(row as unknown as PartRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('料號代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdatePartBody, actorUserId?: string): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Part not found');

        const data: any = {
            updatedBy: actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.brandId !== undefined) data.brandId = body.brandId ?? null;
        if (body.spec !== undefined) data.spec = body.spec ?? null;
        if (typeof body.uom === 'string') data.uom = body.uom.trim() || 'pcs';
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        // brandId 若有填，先確認存在
        if (data.brandId) {
            const b = await this.prisma.nx00Brand.findUnique({ where: { id: data.brandId }, select: { id: true } });
            if (!b) throw new BadRequestException('Brand not found');
        }

        try {
            const row = await this.prisma.nx00Part.update({
                where: { id },
                data,
                include: {
                    brand: { select: { code: true, name: true } } as any,
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toPartDto(row as unknown as PartRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('料號代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<PartDto> {
        const exists = await this.prisma.nx00Part.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Part not found');

        const row = await this.prisma.nx00Part.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: actorUserId ?? null,
            },
            include: {
                brand: { select: { code: true, name: true } } as any,
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        return toPartDto(row as unknown as PartRowWithAudit);
    }
}