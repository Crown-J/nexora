/**
 * File: apps/nx-api/src/nx00/role-view/services/role-view.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-VIEW-SVC-001：RoleView Service（grant/revoke/perms + list/get）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_role_view_id()
 * - @@unique([roleId, viewId])：同 role-view 不可重複（P2002）
 * - grant：若已存在且 inactive，重新啟用（revokedAt/By 清空 + grantedAt/By 更新）
 * - revoke：revokedAt/By + isActive=false
 * - 為寫入 AuditLog（GRANT/UPDATE_PERMS/REVOKE/SET_ACTIVE），Controller 會傳入 ctx（actorUserId/ipAddr/userAgent）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    GrantRoleViewBody,
    ListRoleViewQuery,
    PagedResult,
    RevokeRoleViewBody,
    RoleViewDto,
    RoleViewPerms,
    SetActiveBody,
    UpdateRoleViewPermsBody,
} from '../dto/role-view.dto';

// Prisma error codes (keep minimal, no extra deps)
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type RoleViewRow = {
    id: string;
    roleId: string;
    viewId: string;

    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExport: boolean;

    isActive: boolean;

    grantedAt: Date;
    grantedBy: string | null;
    revokedAt: Date | null;
    revokedBy: string | null;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    grantedByUser?: { displayName: string } | null;
    revokedByUser?: { displayName: string } | null;
    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;

    role?: { code: string; name: string } | null;
    view?: { code: string; name: string; path: string; moduleCode: string } | null;
};

function pickPerms(p?: Partial<RoleViewPerms>): RoleViewPerms {
    return {
        canRead: p?.canRead ?? true,
        canCreate: p?.canCreate ?? false,
        canUpdate: p?.canUpdate ?? false,
        canDelete: p?.canDelete ?? false,
        canExport: p?.canExport ?? false,
    };
}

function toDto(row: RoleViewRow): RoleViewDto {
    return {
        id: row.id,
        roleId: row.roleId,
        viewId: row.viewId,

        perms: {
            canRead: Boolean(row.canRead),
            canCreate: Boolean(row.canCreate),
            canUpdate: Boolean(row.canUpdate),
            canDelete: Boolean(row.canDelete),
            canExport: Boolean(row.canExport),
        },
        isActive: Boolean(row.isActive),

        grantedAt: row.grantedAt?.toISOString?.() ?? String(row.grantedAt),
        grantedBy: row.grantedBy ?? null,
        grantedByName: row.grantedByUser?.displayName ?? null,

        revokedAt: row.revokedAt ? (row.revokedAt.toISOString?.() ?? String(row.revokedAt)) : null,
        revokedBy: row.revokedBy ?? null,
        revokedByName: row.revokedByUser?.displayName ?? null,

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,

        roleCode: row.role?.code ?? null,
        roleName: row.role?.name ?? null,
        viewCode: row.view?.code ?? null,
        viewName: row.view?.name ?? null,
        viewPath: row.view?.path ?? null,
        viewModuleCode: row.view?.moduleCode ?? null,
    };
}

/**
 * RoleView Action Context（用於 AuditLog）
 */
export type RoleViewActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class RoleViewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListRoleViewQuery): Promise<PagedResult<RoleViewDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const where: any = {};
        if (query.roleId) where.roleId = query.roleId;
        if (query.viewId) where.viewId = query.viewId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        // moduleCode 需透過 view 關聯來篩
        if (query.moduleCode) {
            where.view = { moduleCode: query.moduleCode };
        }

        const [total, rows] = await Promise.all([
            this.prisma.nx00RoleView.count({ where }),
            this.prisma.nx00RoleView.findMany({
                where,
                orderBy: [{ roleId: 'asc' }, { viewId: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    grantedByUser: { select: { displayName: true } },
                    revokedByUser: { select: { displayName: true } },
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                    role: { select: { code: true, name: true } },
                    view: { select: { code: true, name: true, path: true, moduleCode: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as RoleViewRow[]).map(toDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<RoleViewDto> {
        const row = await this.prisma.nx00RoleView.findUnique({
            where: { id },
            include: {
                grantedByUser: { select: { displayName: true } },
                revokedByUser: { select: { displayName: true } },
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
                view: { select: { code: true, name: true, path: true, moduleCode: true } },
            },
        });

        if (!row) throw new NotFoundException('RoleView not found');
        return toDto(row as unknown as RoleViewRow);
    }

    async grant(body: GrantRoleViewBody, ctx?: RoleViewActionContext): Promise<RoleViewDto> {
        const roleId = body.roleId?.trim();
        const viewId = body.viewId?.trim();
        if (!roleId) throw new BadRequestException('roleId is required');
        if (!viewId) throw new BadRequestException('viewId is required');

        const perms = pickPerms(body.perms);

        const row = await this.prisma.$transaction(async (tx) => {
            // 檢查 FK（避免 500）
            const [r, v] = await Promise.all([
                tx.nx00Role.findUnique({ where: { id: roleId }, select: { id: true, code: true } }),
                tx.nx00View.findUnique({ where: { id: viewId }, select: { id: true, code: true, moduleCode: true } }),
            ]);
            if (!r) throw new BadRequestException('Role not found');
            if (!v) throw new BadRequestException('View not found');

            const existing = await tx.nx00RoleView.findFirst({
                where: { roleId, viewId },
            });

            if (existing) {
                const updated = await tx.nx00RoleView.update({
                    where: { id: existing.id },
                    data: {
                        ...perms,
                        isActive: true,
                        grantedAt: new Date(),
                        grantedBy: ctx?.actorUserId ?? null,
                        revokedAt: null,
                        revokedBy: null,
                        updatedBy: ctx?.actorUserId ?? null,
                    },
                    include: {
                        grantedByUser: { select: { displayName: true } },
                        revokedByUser: { select: { displayName: true } },
                        createdByUser: { select: { displayName: true } },
                        updatedByUser: { select: { displayName: true } },
                        role: { select: { code: true, name: true } },
                        view: { select: { code: true, name: true, path: true, moduleCode: true } },
                    },
                });

                // AuditLog（GRANT - re-enable or update perms）
                if (ctx?.actorUserId) {
                    await this.audit.write({
                        actorUserId: ctx.actorUserId,
                        moduleCode: 'NX00',
                        action: 'GRANT',
                        entityTable: 'nx00_role_view',
                        entityId: updated.id,
                        entityCode: `${roleId}:${viewId}`,
                        summary: `Grant role-view role=${r.code} view=${v.code}`,
                        beforeData: {
                            id: existing.id,
                            roleId: existing.roleId,
                            viewId: existing.viewId,
                            isActive: Boolean(existing.isActive),
                        },
                        afterData: {
                            id: updated.id,
                            roleId: updated.roleId,
                            viewId: updated.viewId,
                            isActive: Boolean(updated.isActive),
                            perms: pickPerms({
                                canRead: updated.canRead,
                                canCreate: updated.canCreate,
                                canUpdate: updated.canUpdate,
                                canDelete: updated.canDelete,
                                canExport: updated.canExport,
                            }),
                        },
                        ipAddr: ctx.ipAddr ?? null,
                        userAgent: ctx.userAgent ?? null,
                    });
                }

                return updated;
            }

            const created = await tx.nx00RoleView.create({
                data: {
                    roleId,
                    viewId,
                    ...perms,
                    isActive: true,
                    grantedBy: ctx?.actorUserId ?? null,
                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
                    grantedByUser: { select: { displayName: true } },
                    revokedByUser: { select: { displayName: true } },
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                    role: { select: { code: true, name: true } },
                    view: { select: { code: true, name: true, path: true, moduleCode: true } },
                },
            });

            // AuditLog（GRANT - create）
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'GRANT',
                    entityTable: 'nx00_role_view',
                    entityId: created.id,
                    entityCode: `${roleId}:${viewId}`,
                    summary: `Grant role-view role=${r.code} view=${v.code}`,
                    beforeData: null,
                    afterData: {
                        id: created.id,
                        roleId: created.roleId,
                        viewId: created.viewId,
                        isActive: Boolean(created.isActive),
                        perms: pickPerms({
                            canRead: created.canRead,
                            canCreate: created.canCreate,
                            canUpdate: created.canUpdate,
                            canDelete: created.canDelete,
                            canExport: created.canExport,
                        }),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return created;
        });

        return toDto(row as unknown as RoleViewRow);
    }

    async updatePerms(id: string, body: UpdateRoleViewPermsBody, ctx?: RoleViewActionContext): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const p = body?.perms ?? {};
        const data: any = { updatedBy: ctx?.actorUserId ?? null };

        if (p.canRead !== undefined) data.canRead = Boolean(p.canRead);
        if (p.canCreate !== undefined) data.canCreate = Boolean(p.canCreate);
        if (p.canUpdate !== undefined) data.canUpdate = Boolean(p.canUpdate);
        if (p.canDelete !== undefined) data.canDelete = Boolean(p.canDelete);
        if (p.canExport !== undefined) data.canExport = Boolean(p.canExport);

        const row = await this.prisma.nx00RoleView.update({
            where: { id },
            data,
            include: {
                grantedByUser: { select: { displayName: true } },
                revokedByUser: { select: { displayName: true } },
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
                view: { select: { code: true, name: true, path: true, moduleCode: true } },
            },
        });

        // AuditLog（UPDATE_PERMS）
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'UPDATE_PERMS',
                entityTable: 'nx00_role_view',
                entityId: row.id,
                entityCode: `${row.roleId}:${row.viewId}`,
                summary: `Update role-view perms id=${row.id}`,
                beforeData: {
                    perms: {
                        canRead: Boolean(exists.canRead),
                        canCreate: Boolean(exists.canCreate),
                        canUpdate: Boolean(exists.canUpdate),
                        canDelete: Boolean(exists.canDelete),
                        canExport: Boolean(exists.canExport),
                    },
                },
                afterData: {
                    perms: {
                        canRead: Boolean(row.canRead),
                        canCreate: Boolean(row.canCreate),
                        canUpdate: Boolean(row.canUpdate),
                        canDelete: Boolean(row.canDelete),
                        canExport: Boolean(row.canExport),
                    },
                },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toDto(row as unknown as RoleViewRow);
    }

    async revoke(id: string, body: RevokeRoleViewBody, ctx?: RoleViewActionContext): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const revokedAt = body.revokedAt ? new Date(body.revokedAt) : new Date();
        if (Number.isNaN(revokedAt.getTime())) throw new BadRequestException('Invalid revokedAt');

        const row = await this.prisma.nx00RoleView.update({
            where: { id },
            data: {
                isActive: false,
                revokedAt,
                revokedBy: ctx?.actorUserId ?? null,
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: {
                grantedByUser: { select: { displayName: true } },
                revokedByUser: { select: { displayName: true } },
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
                view: { select: { code: true, name: true, path: true, moduleCode: true } },
            },
        });

        // AuditLog（REVOKE）
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'REVOKE',
                entityTable: 'nx00_role_view',
                entityId: row.id,
                entityCode: `${row.roleId}:${row.viewId}`,
                summary: `Revoke role-view id=${row.id}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive), revokedAt: row.revokedAt },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toDto(row as unknown as RoleViewRow);
    }

    async setActive(id: string, body: SetActiveBody, ctx?: RoleViewActionContext): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const isActive = Boolean(body.isActive);

        const row = await this.prisma.nx00RoleView.update({
            where: { id },
            data: isActive
                ? {
                    isActive: true,
                    grantedAt: new Date(),
                    grantedBy: ctx?.actorUserId ?? null,
                    revokedAt: null,
                    revokedBy: null,
                    updatedBy: ctx?.actorUserId ?? null,
                }
                : {
                    isActive: false,
                    revokedAt: exists.revokedAt ?? new Date(),
                    revokedBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
            include: {
                grantedByUser: { select: { displayName: true } },
                revokedByUser: { select: { displayName: true } },
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
                view: { select: { code: true, name: true, path: true, moduleCode: true } },
            },
        });

        // AuditLog（SET_ACTIVE）
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_role_view',
                entityId: row.id,
                entityCode: `${row.roleId}:${row.viewId}`,
                summary: `Set role-view active=${isActive} id=${row.id}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toDto(row as unknown as RoleViewRow);
    }
}