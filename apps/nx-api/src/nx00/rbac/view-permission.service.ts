/**
 * 依 nx00_role_view 合併「目前 JWT 使用者＋租戶」之畫面權限（多職務 OR）。
 * - 凡 JWT roles 含 **ADMIN**（租戶內系統管理員或平台）：merge 回傳 null → 略過 Guard（租戶資料範圍仍依 **tenantId**）
 */

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

import type { Nx00ViewAction } from './nx00-view-action';

export type MergedNx00ViewPerms = {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canToggleActive: boolean;
    canExport: boolean;
};

@Injectable()
export class ViewPermissionService {
    constructor(private readonly prisma: PrismaService) { }

    /** JWT roles 或 DB 任一認定為 ADMIN → 略過矩陣（避免 roles 與 DB 短暫不一致時誤擋） */
    private rolesIncludeAdmin(roles: string[] | undefined): boolean {
        return (roles ?? []).some((r) => String(r).trim().toUpperCase() === 'ADMIN');
    }

    private async userHasActiveAdminAssignment(userId: string, tenantId: string | null): Promise<boolean> {
        const row = await this.prisma.nx00UserRole.findFirst({
            where: {
                userId,
                isActive: true,
                ...(tenantId ? { tenantId } : {}),
                role: { code: 'ADMIN', isActive: true },
            },
            select: { id: true },
        });
        return Boolean(row);
    }

    /** null＝具 ADMIN 職務略過矩陣檢查；空物件＝無任何授權列 */
    async mergeForRequestUser(user: RequestUser): Promise<Record<string, MergedNx00ViewPerms> | null> {
        if (this.rolesIncludeAdmin(user.roles)) return null;
        if (await this.userHasActiveAdminAssignment(user.sub, user.tenantId ?? null)) return null;
        const tid = user.tenantId;
        if (!tid) return {};

        const urs = await this.prisma.nx00UserRole.findMany({
            where: { userId: user.sub, tenantId: tid, isActive: true },
            select: { roleId: true },
        });
        const roleIds = urs.map((r) => r.roleId);
        if (roleIds.length === 0) return {};

        const rows = await this.prisma.nx00RoleView.findMany({
            where: { tenantId: tid, isActive: true, roleId: { in: roleIds } },
            include: { view: { select: { code: true } } },
        });

        const map: Record<string, MergedNx00ViewPerms> = {};
        const z = (): MergedNx00ViewPerms => ({
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canToggleActive: false,
            canExport: false,
        });

        for (const r of rows) {
            const code = r.view.code?.trim();
            if (!code) continue;
            if (!map[code]) map[code] = z();
            const m = map[code];
            m.canRead ||= r.canRead;
            m.canCreate ||= r.canCreate;
            m.canUpdate ||= r.canUpdate;
            m.canToggleActive ||= r.canToggleActive;
            m.canExport ||= r.canExport;
        }

        return map;
    }

    /**
     * /auth/me 用：isPlatformAdmin 為「任一租戶曾掛 ADMIN」；roleIds 僅限 user.tenantId 該租戶。
     */
    async mergeForProfile(args: {
        tenantId: string | null;
        isPlatformAdmin: boolean;
        roleIdsForTenant: string[];
    }): Promise<Record<string, MergedNx00ViewPerms> | null> {
        if (args.isPlatformAdmin) return null;
        const tid = args.tenantId;
        if (!tid || args.roleIdsForTenant.length === 0) return {};

        const rows = await this.prisma.nx00RoleView.findMany({
            where: { tenantId: tid, isActive: true, roleId: { in: args.roleIdsForTenant } },
            include: { view: { select: { code: true } } },
        });

        const map: Record<string, MergedNx00ViewPerms> = {};
        const z = (): MergedNx00ViewPerms => ({
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canToggleActive: false,
            canExport: false,
        });

        for (const r of rows) {
            const code = r.view.code?.trim();
            if (!code) continue;
            if (!map[code]) map[code] = z();
            const m = map[code];
            m.canRead ||= r.canRead;
            m.canCreate ||= r.canCreate;
            m.canUpdate ||= r.canUpdate;
            m.canToggleActive ||= r.canToggleActive;
            m.canExport ||= r.canExport;
        }

        return map;
    }

    actionSatisfied(perms: MergedNx00ViewPerms | undefined, action: Nx00ViewAction): boolean {
        if (!perms) return false;
        switch (action) {
            case 'read':
                return perms.canRead;
            case 'create':
                return perms.canCreate;
            case 'update':
                return perms.canUpdate;
            case 'toggleActive':
                return perms.canToggleActive;
            case 'export':
                return perms.canExport;
            default:
                return false;
        }
    }
}
