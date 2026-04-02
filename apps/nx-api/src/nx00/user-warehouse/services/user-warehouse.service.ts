/**
 * File: apps/nx-api/src/nx00/user-warehouse/services/user-warehouse.service.ts
 *
 * Purpose:
 * - NX00-API-USER-WH-SVC-001：使用者據點對應（assign / revoke / list）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    AssignUserWarehouseBody,
    ListUserWarehouseQuery,
    PagedResult,
    RevokeUserWarehouseBody,
    UserWarehouseDto,
} from '../dto/user-warehouse.dto';

type PrismaKnownError = { code?: string; meta?: unknown; message?: string };

type UserWarehouseRow = {
    id: string;
    userId: string;
    warehouseId: string;
    isActive: boolean;
    assignedAt: Date;
    assignedBy: string | null;
    revokedAt: Date | null;
    assignedByUser?: { displayName: string } | null;
    user?: { displayName: string } | null;
    warehouse?: { code: string; name: string } | null;
};

function toDto(row: UserWarehouseRow): UserWarehouseDto {
    return {
        id: row.id,
        userId: row.userId,
        warehouseId: row.warehouseId,
        isActive: Boolean(row.isActive),
        assignedAt: row.assignedAt?.toISOString?.() ?? String(row.assignedAt),
        assignedBy: row.assignedBy ?? null,
        assignedByName: row.assignedByUser?.displayName ?? null,
        revokedAt: row.revokedAt ? (row.revokedAt.toISOString?.() ?? String(row.revokedAt)) : null,
        userDisplayName: row.user?.displayName ?? null,
        warehouseCode: row.warehouse?.code ?? null,
        warehouseName: row.warehouse?.name ?? null,
    };
}

export type UserWarehouseActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class UserWarehouseService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) {}

    async list(query: ListUserWarehouseQuery): Promise<PagedResult<UserWarehouseDto>> {
        const page = Number.isFinite(query.page as number) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as number) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const where: Record<string, unknown> = {};
        if (query.userId) where.userId = query.userId;
        if (query.warehouseId) where.warehouseId = query.warehouseId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00UserWarehouse.count({ where }),
            this.prisma.nx00UserWarehouse.findMany({
                where,
                orderBy: [{ assignedAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    assignedByUser: { select: { displayName: true } },
                    user: { select: { displayName: true } },
                    warehouse: { select: { code: true, name: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as UserWarehouseRow[]).map(toDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<UserWarehouseDto> {
        const row = await this.prisma.nx00UserWarehouse.findUnique({
            where: { id },
            include: {
                assignedByUser: { select: { displayName: true } },
                user: { select: { displayName: true } },
                warehouse: { select: { code: true, name: true } },
            },
        });
        if (!row) throw new NotFoundException('UserWarehouse not found');
        return toDto(row as unknown as UserWarehouseRow);
    }

    async assign(body: AssignUserWarehouseBody, ctx?: UserWarehouseActionContext): Promise<UserWarehouseDto> {
        const userId = body.userId?.trim();
        const warehouseId = body.warehouseId?.trim();
        if (!userId) throw new BadRequestException('userId is required');
        if (!warehouseId) throw new BadRequestException('warehouseId is required');

        try {
            const [u, w] = await Promise.all([
                this.prisma.nx00User.findUnique({ where: { id: userId }, select: { id: true, displayName: true } }),
                this.prisma.nx00Warehouse.findUnique({
                    where: { id: warehouseId },
                    select: { id: true, code: true, name: true },
                }),
            ]);
            if (!u) throw new BadRequestException('User not found');
            if (!w) throw new BadRequestException('Warehouse not found');

            const row = await this.prisma.nx00UserWarehouse.create({
                data: {
                    userId,
                    warehouseId,
                    assignedBy: ctx?.actorUserId ?? null,
                    isActive: true,
                },
                include: {
                    assignedByUser: { select: { displayName: true } },
                    user: { select: { displayName: true } },
                    warehouse: { select: { code: true, name: true } },
                },
            });

            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'ASSIGN',
                    entityTable: 'nx00_user_warehouse',
                    entityId: row.id,
                    entityCode: `${row.userId}:${row.warehouseId}`,
                    summary: `Assign warehouse ${w.code} to user ${userId}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        userId: row.userId,
                        warehouseId: row.warehouseId,
                        isActive: true,
                        assignedAt: row.assignedAt?.toISOString?.() ?? String(row.assignedAt),
                        assignedBy: row.assignedBy ?? null,
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toDto(row as unknown as UserWarehouseRow);
        } catch (e: unknown) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('此使用者已擁有該據點（不可重複指派）');
            }
            throw e;
        }
    }

    async revoke(id: string, body: RevokeUserWarehouseBody, ctx?: UserWarehouseActionContext): Promise<UserWarehouseDto> {
        const exists = await this.prisma.nx00UserWarehouse.findUnique({
            where: { id },
            include: {
                user: { select: { displayName: true } },
                warehouse: { select: { code: true, name: true } },
            },
        });
        if (!exists) throw new NotFoundException('UserWarehouse not found');

        const revokedAt = body.revokedAt ? new Date(body.revokedAt) : new Date();
        if (Number.isNaN(revokedAt.getTime())) throw new BadRequestException('Invalid revokedAt');

        const row = await this.prisma.nx00UserWarehouse.update({
            where: { id },
            data: { revokedAt, isActive: false },
            include: {
                assignedByUser: { select: { displayName: true } },
                user: { select: { displayName: true } },
                warehouse: { select: { code: true, name: true } },
            },
        });

        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'REVOKE',
                entityTable: 'nx00_user_warehouse',
                entityId: row.id,
                entityCode: `${row.userId}:${row.warehouseId}`,
                summary: `Revoke warehouse ${row.warehouse?.code ?? row.warehouseId} from user ${row.userId}`,
                beforeData: {
                    id: exists.id,
                    isActive: Boolean(exists.isActive),
                    revokedAt: exists.revokedAt ? (exists.revokedAt.toISOString?.() ?? String(exists.revokedAt)) : null,
                },
                afterData: {
                    id: row.id,
                    isActive: Boolean(row.isActive),
                    revokedAt: row.revokedAt ? (row.revokedAt.toISOString?.() ?? String(row.revokedAt)) : null,
                },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toDto(row as unknown as UserWarehouseRow);
    }
}
