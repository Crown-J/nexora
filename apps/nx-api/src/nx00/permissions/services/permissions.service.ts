/**
 * File: apps/nx-api/src/nx00/permissions/services/permissions.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PERMISSIONS-SVC-001：Permissions Service（CRUD + audit user displayName）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    CreatePermissionBody,
    ListPermissionsQuery,
    PagedResult,
    PermissionDto,
    UpdatePermissionBody,
} from '../dto/permissions.dto';

type PermissionRowWithAudit = {
    id: string;
    code: string;
    name: string;
    moduleCode: string;
    action: string;
    isActive: boolean;
    sortNo: number | null;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toPermissionDto(row: PermissionRowWithAudit): PermissionDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        moduleCode: row.moduleCode,
        action: row.action,
        isActive: Boolean(row.isActive),
        sortNo: row.sortNo ?? null,

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt ? (row.updatedAt.toISOString?.() ?? String(row.updatedAt)) : null,
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

function getPrismaCode(err: unknown): string | null {
    if (typeof err !== 'object' || !err) return null;
    const anyErr = err as any;
    return typeof anyErr.code === 'string' ? anyErr.code : null;
}

@Injectable()
export class PermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * @CODE nxapi_nx00_permissions_list_001
     * 說明：
     * - GET /nx00/permissions?q=&moduleCode=&action=&isActive=&page=&pageSize=
     */
    async list(query: ListPermissionsQuery): Promise<PagedResult<PermissionDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;
        const moduleCode = query.moduleCode?.trim() ? query.moduleCode.trim() : undefined;
        const action = query.action?.trim() ? query.action.trim() : undefined;

        const where: any = {};

        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (moduleCode) where.moduleCode = { equals: moduleCode, mode: 'insensitive' };
        if (action) where.action = { equals: action, mode: 'insensitive' };
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Permission.count({ where }),
            this.prisma.nx00Permission.findMany({
                where,
                orderBy: [{ moduleCode: 'asc' }, { action: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as PermissionRowWithAudit[]).map(toPermissionDto),
            page,
            pageSize,
            total,
        };
    }

    /**
     * @CODE nxapi_nx00_permissions_get_001
     * 說明：
     * - GET /nx00/permissions/:id
     */
    async get(id: string): Promise<PermissionDto> {
        const row = await this.prisma.nx00Permission.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Permission not found');
        return toPermissionDto(row as unknown as PermissionRowWithAudit);
    }

    /**
     * @CODE nxapi_nx00_permissions_create_001
     * 說明：
     * - POST /nx00/permissions
     */
    async create(body: CreatePermissionBody, actorUserId?: string): Promise<PermissionDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();
        const moduleCode = body.moduleCode?.trim();
        const action = body.action?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');
        if (!moduleCode) throw new BadRequestException('moduleCode is required');
        if (!action) throw new BadRequestException('action is required');

        try {
            const row = await this.prisma.nx00Permission.create({
                data: {
                    code,
                    name,
                    moduleCode,
                    action,
                    isActive: body.isActive ?? true,
                    sortNo: body.sortNo ?? null,
                    createdBy: actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toPermissionDto(row as unknown as PermissionRowWithAudit);
        } catch (err) {
            const pcode = getPrismaCode(err);
            if (pcode === 'P2002') throw new BadRequestException('permission code already exists');
            throw err;
        }
    }

    /**
     * @CODE nxapi_nx00_permissions_update_001
     * 說明：
     * - PUT /nx00/permissions/:id
     */
    async update(id: string, body: UpdatePermissionBody, actorUserId?: string): Promise<PermissionDto> {
        const exists = await this.prisma.nx00Permission.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new NotFoundException('Permission not found');

        const data: any = {
            updatedAt: new Date(),
            updatedBy: actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (typeof body.moduleCode === 'string') data.moduleCode = body.moduleCode.trim();
        if (typeof body.action === 'string') data.action = body.action.trim();
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
        if (body.sortNo !== undefined) data.sortNo = body.sortNo;

        try {
            const row = await this.prisma.nx00Permission.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toPermissionDto(row as unknown as PermissionRowWithAudit);
        } catch (err) {
            const pcode = getPrismaCode(err);
            if (pcode === 'P2002') throw new BadRequestException('permission code already exists');
            throw err;
        }
    }
}