/**
 * File: apps/nx-api/src/nx00/role/services/role.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-SVC-001：Role Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_role_id()
 * - 欄位對齊 nx00_role（LITE）：is_system / is_active / sort_no / audit fields
 * - 為寫入 AuditLog（CREATE/UPDATE/SET_ACTIVE），Controller 會傳入 ctx（actorUserId/ipAddr/userAgent）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreateRoleBody,
    ListRoleQuery,
    PagedResult,
    RoleDto,
    SetActiveBody,
    UpdateRoleBody,
} from '../dto/role.dto';

// Prisma error codes (keep minimal, no extra deps)
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type RoleRowWithAudit = {
    id: string;
    code: string;
    name: string;
    description: string | null;

    isSystem: boolean;
    isActive: boolean;
    sortNo: number;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toRoleDto(row: RoleRowWithAudit): RoleDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? null,

        isSystem: Boolean(row.isSystem),
        isActive: Boolean(row.isActive),
        sortNo: Number.isFinite(row.sortNo as any) ? Number(row.sortNo) : 0,

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

/**
 * Role CRUD Context（用於 AuditLog）
 */
export type RoleActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class RoleService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListRoleQuery): Promise<PagedResult<RoleDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where = q
            ? {
                OR: [
                    { code: { contains: q, mode: 'insensitive' as const } },
                    { name: { contains: q, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [total, rows] = await Promise.all([
            this.prisma.nx00Role.count({ where }),
            this.prisma.nx00Role.findMany({
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
            items: (rows as unknown as RoleRowWithAudit[]).map(toRoleDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<RoleDto> {
        const row = await this.prisma.nx00Role.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        if (!row) throw new NotFoundException('Role not found');
        return toRoleDto(row as unknown as RoleRowWithAudit);
    }

    async create(body: CreateRoleBody, ctx?: RoleActionContext): Promise<RoleDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        try {
            // id 交給 DB default：gen_nx00_role_id()
            const row = await this.prisma.nx00Role.create({
                data: {
                    code,
                    name,
                    description: body.description ?? null,

                    isSystem: body.isSystem ?? false,
                    isActive: body.isActive ?? true,
                    sortNo: body.sortNo ?? 0,

                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（CREATE）：若沒有 actorUserId（例如系統 seed/批次），就不寫
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_role',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create role ${row.code}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        description: row.description ?? null,
                        isSystem: Boolean(row.isSystem),
                        isActive: Boolean(row.isActive),
                        sortNo: Number(row.sortNo ?? 0),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toRoleDto(row as unknown as RoleRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;

            if (pe?.code === 'P2002') {
                throw new BadRequestException('角色代碼已存在，請更換 code');
            }

            throw e;
        }
    }

    async update(id: string, body: UpdateRoleBody, ctx?: RoleActionContext): Promise<RoleDto> {
        const exists = await this.prisma.nx00Role.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Role not found');

        // 系統內建角色：限制改 code（依你的欄位說明）
        if (exists.isSystem && typeof body.code === 'string' && body.code.trim() !== exists.code) {
            throw new BadRequestException('系統內建角色不可修改 code');
        }

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.description !== undefined) data.description = body.description ?? null;

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
        if (typeof body.sortNo === 'number' && Number.isFinite(body.sortNo)) data.sortNo = body.sortNo;

        // isSystem 不提供 update（避免被改成/改掉系統角色）

        try {
            const row = await this.prisma.nx00Role.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（UPDATE）
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'UPDATE',
                    entityTable: 'nx00_role',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update role ${row.code}`,
                    beforeData: {
                        id: exists.id,
                        code: exists.code,
                        name: exists.name,
                        description: exists.description ?? null,
                        isSystem: Boolean(exists.isSystem),
                        isActive: Boolean(exists.isActive),
                        sortNo: Number(exists.sortNo ?? 0),
                    },
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        description: row.description ?? null,
                        isSystem: Boolean(row.isSystem),
                        isActive: Boolean(row.isActive),
                        sortNo: Number(row.sortNo ?? 0),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toRoleDto(row as unknown as RoleRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('角色代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: RoleActionContext): Promise<RoleDto> {
        const exists = await this.prisma.nx00Role.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Role not found');

        const row = await this.prisma.nx00Role.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        // AuditLog（SET_ACTIVE）
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_role',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set role ${row.code} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toRoleDto(row as unknown as RoleRowWithAudit);
    }
}