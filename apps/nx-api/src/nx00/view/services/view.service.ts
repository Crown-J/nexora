/**
 * File: apps/nx-api/src/nx00/view/services/view.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-VIEW-SVC-001：View Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_view_id()
 * - code UNIQUE（P2002）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    CreateViewBody,
    ListViewQuery,
    PagedResult,
    SetActiveBody,
    UpdateViewBody,
    ViewDto,
} from '../dto/view.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type ViewRowWithAudit = {
    id: string;
    code: string;
    name: string;
    moduleCode: string;
    path: string;
    sortNo: number;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toViewDto(row: ViewRowWithAudit): ViewDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        moduleCode: row.moduleCode,
        path: row.path,
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
export class ViewService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListViewQuery): Promise<PagedResult<ViewDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { path: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (query.moduleCode) where.moduleCode = query.moduleCode;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00View.count({ where }),
            this.prisma.nx00View.findMany({
                where,
                orderBy: [{ moduleCode: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as ViewRowWithAudit[]).map(toViewDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<ViewDto> {
        const row = await this.prisma.nx00View.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('View not found');
        return toViewDto(row as unknown as ViewRowWithAudit);
    }

    async create(body: CreateViewBody, actorUserId?: string): Promise<ViewDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();
        const moduleCode = body.moduleCode?.trim();
        const path = body.path?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');
        if (!moduleCode) throw new BadRequestException('moduleCode is required');
        if (!path) throw new BadRequestException('path is required');

        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        try {
            const row = await this.prisma.nx00View.create({
                data: {
                    code,
                    name,
                    moduleCode,
                    path,
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

            return toViewDto(row as unknown as ViewRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('View 代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdateViewBody, actorUserId?: string): Promise<ViewDto> {
        const exists = await this.prisma.nx00View.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('View not found');

        const data: any = {
            updatedBy: actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (typeof body.moduleCode === 'string') data.moduleCode = body.moduleCode.trim();
        if (typeof body.path === 'string') data.path = body.path.trim();

        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) {
                throw new BadRequestException('sortNo must be a number');
            }
            data.sortNo = body.sortNo;
        }

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00View.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toViewDto(row as unknown as ViewRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('View 代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<ViewDto> {
        const exists = await this.prisma.nx00View.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('View not found');

        const row = await this.prisma.nx00View.update({
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

        return toViewDto(row as unknown as ViewRowWithAudit);
    }
}