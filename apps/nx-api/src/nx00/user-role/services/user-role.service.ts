/**
 * File: apps/nx-api/src/nx00/user-role/services/user-role.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-SVC-001：UserRole Service（assign/revoke/setPrimary + list/get）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_user_role_id()
 * - @@unique([userId, roleId])：同 user-role 不可重複（P2002）
 * - revoke：revoked_at=now + is_active=false
 * - primary：同一個 user 只能有一個 is_primary=true（service 內以 transaction 保護）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    AssignUserRoleBody,
    ListUserRoleQuery,
    PagedResult,
    RevokeUserRoleBody,
    SetActiveBody,
    SetPrimaryBody,
    UserRoleDto,
} from '../dto/user-role.dto';

// Prisma error codes
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type UserRoleRow = {
    id: string;
    userId: string;
    roleId: string;

    isPrimary: boolean;
    isActive: boolean;

    assignedAt: Date;
    assignedBy: string | null;
    revokedAt: Date | null;

    assignedByUser?: { displayName: string } | null;
    user?: { displayName: string } | null;
    role?: { code: string; name: string } | null;
};

function toDto(row: UserRoleRow): UserRoleDto {
    return {
        id: row.id,
        userId: row.userId,
        roleId: row.roleId,

        isPrimary: Boolean(row.isPrimary),
        isActive: Boolean(row.isActive),

        assignedAt: row.assignedAt?.toISOString?.() ?? String(row.assignedAt),
        assignedBy: row.assignedBy ?? null,
        assignedByName: row.assignedByUser?.displayName ?? null,

        revokedAt: row.revokedAt ? (row.revokedAt.toISOString?.() ?? String(row.revokedAt)) : null,

        userDisplayName: row.user?.displayName ?? null,
        roleCode: row.role?.code ?? null,
        roleName: row.role?.name ?? null,
    };
}

@Injectable()
export class UserRoleService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListUserRoleQuery): Promise<PagedResult<UserRoleDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const where: any = {};
        if (query.userId) where.userId = query.userId;
        if (query.roleId) where.roleId = query.roleId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00UserRole.count({ where }),
            this.prisma.nx00UserRole.findMany({
                where,
                orderBy: [{ assignedAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    assignedByUser: { select: { displayName: true } },
                    user: { select: { displayName: true } },
                    role: { select: { code: true, name: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as UserRoleRow[]).map(toDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<UserRoleDto> {
        const row = await this.prisma.nx00UserRole.findUnique({
            where: { id },
            include: {
                assignedByUser: { select: { displayName: true } },
                user: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
            },
        });

        if (!row) throw new NotFoundException('UserRole not found');
        return toDto(row as unknown as UserRoleRow);
    }

    async assign(body: AssignUserRoleBody, actorUserId?: string): Promise<UserRoleDto> {
        const userId = body.userId?.trim();
        const roleId = body.roleId?.trim();
        const isPrimary = body.isPrimary ?? false;

        if (!userId) throw new BadRequestException('userId is required');
        if (!roleId) throw new BadRequestException('roleId is required');

        // 交易：若設 primary=true，同 user 其他 primary 要清掉
        try {
            const row = await this.prisma.$transaction(async (tx) => {
                // 確認 user/role 存在（避免 FK error 變成 500）
                const [u, r] = await Promise.all([
                    tx.nx00User.findUnique({ where: { id: userId }, select: { id: true } }),
                    tx.nx00Role.findUnique({ where: { id: roleId }, select: { id: true } }),
                ]);
                if (!u) throw new BadRequestException('User not found');
                if (!r) throw new BadRequestException('Role not found');

                // 如果指定 primary=true，先把同 user 其他 active 的 primary 清掉
                if (isPrimary) {
                    await tx.nx00UserRole.updateMany({
                        where: { userId, isActive: true, isPrimary: true },
                        data: { isPrimary: false },
                    });
                }

                // 建立（id 由 DB default）
                const created = await tx.nx00UserRole.create({
                    data: {
                        userId,
                        roleId,
                        isPrimary,
                        assignedBy: actorUserId ?? null,
                        // assignedAt default now()
                        isActive: true,
                    },
                    include: {
                        assignedByUser: { select: { displayName: true } },
                        user: { select: { displayName: true } },
                        role: { select: { code: true, name: true } },
                    },
                });

                return created;
            });

            return toDto(row as unknown as UserRoleRow);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                // @@unique([userId, roleId])
                throw new BadRequestException('此使用者已擁有該角色（不可重複指派）');
            }
            throw e;
        }
    }

    async revoke(id: string, body: RevokeUserRoleBody, actorUserId?: string): Promise<UserRoleDto> {
        const exists = await this.prisma.nx00UserRole.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('UserRole not found');

        const revokedAt = body.revokedAt ? new Date(body.revokedAt) : new Date();
        if (Number.isNaN(revokedAt.getTime())) throw new BadRequestException('Invalid revokedAt');

        const row = await this.prisma.nx00UserRole.update({
            where: { id },
            data: {
                revokedAt,
                isActive: false,
                // 這張表沒有 updatedBy/updatedAt 欄位，所以不寫 actor
            },
            include: {
                assignedByUser: { select: { displayName: true } },
                user: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
            },
        });

        return toDto(row as unknown as UserRoleRow);
    }

    async setPrimary(id: string, body: SetPrimaryBody, actorUserId?: string): Promise<UserRoleDto> {
        const exists = await this.prisma.nx00UserRole.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('UserRole not found');
        if (!exists.isActive) throw new BadRequestException('Inactive userRole cannot be primary');

        const isPrimary = Boolean(body.isPrimary);

        const row = await this.prisma.$transaction(async (tx) => {
            if (isPrimary) {
                // 同 user 其他 active primary 清掉
                await tx.nx00UserRole.updateMany({
                    where: { userId: exists.userId, isActive: true, isPrimary: true },
                    data: { isPrimary: false },
                });
            }

            const updated = await tx.nx00UserRole.update({
                where: { id },
                data: { isPrimary },
                include: {
                    assignedByUser: { select: { displayName: true } },
                    user: { select: { displayName: true } },
                    role: { select: { code: true, name: true } },
                },
            });

            return updated;
        });

        return toDto(row as unknown as UserRoleRow);
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<UserRoleDto> {
        const exists = await this.prisma.nx00UserRole.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('UserRole not found');

        const isActive = Boolean(body.isActive);

        const row = await this.prisma.nx00UserRole.update({
            where: { id },
            data: {
                isActive,
                revokedAt: isActive ? null : (exists.revokedAt ?? new Date()),
                // 若停用，通常也不應該是 primary
                isPrimary: isActive ? exists.isPrimary : false,
            },
            include: {
                assignedByUser: { select: { displayName: true } },
                user: { select: { displayName: true } },
                role: { select: { code: true, name: true } },
            },
        });

        return toDto(row as unknown as UserRoleRow);
    }
}