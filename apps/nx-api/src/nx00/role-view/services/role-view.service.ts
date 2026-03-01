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
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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

@Injectable()
export class RoleViewService {
    constructor(private readonly prisma: PrismaService) { }

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

    async grant(body: GrantRoleViewBody, actorUserId?: string): Promise<RoleViewDto> {
        const roleId = body.roleId?.trim();
        const viewId = body.viewId?.trim();
        if (!roleId) throw new BadRequestException('roleId is required');
        if (!viewId) throw new BadRequestException('viewId is required');

        const perms = pickPerms(body.perms);

        // 交易：若存在就更新+啟用，若不存在就建立
        const row = await this.prisma.$transaction(async (tx) => {
            // 檢查 FK（避免 500）
            const [r, v] = await Promise.all([
                tx.nx00Role.findUnique({ where: { id: roleId }, select: { id: true } }),
                tx.nx00View.findUnique({ where: { id: viewId }, select: { id: true } }),
            ]);
            if (!r) throw new BadRequestException('Role not found');
            if (!v) throw new BadRequestException('View not found');

            const existing = await tx.nx00RoleView.findFirst({
                where: { roleId, viewId },
            });

            if (existing) {
                return tx.nx00RoleView.update({
                    where: { id: existing.id },
                    data: {
                        ...perms,
                        isActive: true,
                        grantedAt: new Date(),
                        grantedBy: actorUserId ?? null,
                        revokedAt: null,
                        revokedBy: null,
                        updatedBy: actorUserId ?? null,
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
            }

            return tx.nx00RoleView.create({
                data: {
                    roleId,
                    viewId,
                    ...perms,
                    isActive: true,
                    grantedBy: actorUserId ?? null,
                    createdBy: actorUserId ?? null,
                    updatedBy: actorUserId ?? null,
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
        });

        return toDto(row as unknown as RoleViewRow);
    }

    async updatePerms(id: string, body: UpdateRoleViewPermsBody, actorUserId?: string): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const p = body?.perms ?? {};
        const data: any = { updatedBy: actorUserId ?? null };

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

        return toDto(row as unknown as RoleViewRow);
    }

    async revoke(id: string, body: RevokeRoleViewBody, actorUserId?: string): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const revokedAt = body.revokedAt ? new Date(body.revokedAt) : new Date();
        if (Number.isNaN(revokedAt.getTime())) throw new BadRequestException('Invalid revokedAt');

        const row = await this.prisma.nx00RoleView.update({
            where: { id },
            data: {
                isActive: false,
                revokedAt,
                revokedBy: actorUserId ?? null,
                updatedBy: actorUserId ?? null,
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

        return toDto(row as unknown as RoleViewRow);
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<RoleViewDto> {
        const exists = await this.prisma.nx00RoleView.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('RoleView not found');

        const isActive = Boolean(body.isActive);

        const row = await this.prisma.nx00RoleView.update({
            where: { id },
            data: isActive
                ? {
                    isActive: true,
                    grantedAt: new Date(),
                    grantedBy: actorUserId ?? null,
                    revokedAt: null,
                    revokedBy: null,
                    updatedBy: actorUserId ?? null,
                }
                : {
                    isActive: false,
                    revokedAt: exists.revokedAt ?? new Date(),
                    revokedBy: actorUserId ?? null,
                    updatedBy: actorUserId ?? null,
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

        return toDto(row as unknown as RoleViewRow);
    }
}