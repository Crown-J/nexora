/**
 * File: apps/nx-api/src/nx00/warehouse/services/warehouse.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-SVC-001：Warehouse Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_warehouse_id()
 * - code UNIQUE（P2002）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    CreateWarehouseBody,
    ListWarehouseQuery,
    PagedResult,
    SetActiveBody,
    UpdateWarehouseBody,
    WarehouseDto,
} from '../dto/warehouse.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type WarehouseRowWithAudit = {
    id: string;
    code: string;
    name: string;
    remark: string | null;
    sortNo: number;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toWarehouseDto(row: WarehouseRowWithAudit): WarehouseDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        remark: row.remark ?? null,
        sortNo: Number.isFinite(row.sortNo as any) ? Number(row.sortNo) : 0,
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
export class WarehouseService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListWarehouseQuery): Promise<PagedResult<WarehouseDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { remark: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Warehouse.count({ where }),
            this.prisma.nx00Warehouse.findMany({
                where,
                orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as WarehouseRowWithAudit[]).map(toWarehouseDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<WarehouseDto> {
        const row = await this.prisma.nx00Warehouse.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Warehouse not found');
        return toWarehouseDto(row as unknown as WarehouseRowWithAudit);
    }

    async create(body: CreateWarehouseBody, actorUserId?: string): Promise<WarehouseDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();
        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        try {
            const row = await this.prisma.nx00Warehouse.create({
                data: {
                    code,
                    name,
                    remark: body.remark ?? null,
                    sortNo,
                    isActive: body.isActive ?? true,

                    createdBy: actorUserId ?? null,
                    updatedBy: actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toWarehouseDto(row as unknown as WarehouseRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('倉庫代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdateWarehouseBody, actorUserId?: string): Promise<WarehouseDto> {
        const exists = await this.prisma.nx00Warehouse.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Warehouse not found');

        const data: any = {
            updatedBy: actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.remark !== undefined) data.remark = body.remark ?? null;

        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) {
                throw new BadRequestException('sortNo must be a number');
            }
            data.sortNo = body.sortNo;
        }

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00Warehouse.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toWarehouseDto(row as unknown as WarehouseRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('倉庫代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<WarehouseDto> {
        const exists = await this.prisma.nx00Warehouse.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Warehouse not found');

        const row = await this.prisma.nx00Warehouse.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: actorUserId ?? null,
            },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        return toWarehouseDto(row as unknown as WarehouseRowWithAudit);
    }
}