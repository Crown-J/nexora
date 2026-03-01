/**
 * File: apps/nx-api/src/nx00/location/services/location.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-SVC-001：Location Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_location_id()
 * - @@unique([warehouseId, code])（P2002）
 * - warehouseId 必填，create/update 時先確認 warehouse 存在（避免 FK 500）
 * - 為寫入 AuditLog，Controller 會傳入 ctx（actorUserId/ipAddr/userAgent）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreateLocationBody,
    ListLocationQuery,
    LocationDto,
    PagedResult,
    SetActiveBody,
    UpdateLocationBody,
} from '../dto/location.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type LocationRowWithAudit = {
    id: string;
    warehouseId: string;
    code: string;
    name: string | null;

    zone: string | null;
    rack: string | null;
    levelNo: number | null;
    binNo: string | null;

    remark: string | null;
    sortNo: number;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;

    warehouse?: { code: string; name: string } | null;
};

function toLocationDto(row: LocationRowWithAudit): LocationDto {
    return {
        id: row.id,
        warehouseId: row.warehouseId,
        warehouseCode: row.warehouse?.code ?? null,
        warehouseName: row.warehouse?.name ?? null,

        code: row.code,
        name: row.name ?? null,

        zone: row.zone ?? null,
        rack: row.rack ?? null,
        levelNo: row.levelNo ?? null,
        binNo: row.binNo ?? null,

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

/**
 * Location Action Context（用於 AuditLog）
 */
export type LocationActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class LocationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListLocationQuery): Promise<PagedResult<LocationDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { zone: { contains: q, mode: 'insensitive' as const } },
                { rack: { contains: q, mode: 'insensitive' as const } },
                { binNo: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (query.warehouseId) where.warehouseId = query.warehouseId;
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Location.count({ where }),
            this.prisma.nx00Location.findMany({
                where,
                orderBy: [{ warehouseId: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    warehouse: { select: { code: true, name: true } },
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as LocationRowWithAudit[]).map(toLocationDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<LocationDto> {
        const row = await this.prisma.nx00Location.findUnique({
            where: { id },
            include: {
                warehouse: { select: { code: true, name: true } },
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Location not found');
        return toLocationDto(row as unknown as LocationRowWithAudit);
    }

    async create(body: CreateLocationBody, ctx?: LocationActionContext): Promise<LocationDto> {
        const warehouseId = body.warehouseId?.trim();
        const code = body.code?.trim();

        if (!warehouseId) throw new BadRequestException('warehouseId is required');
        if (!code) throw new BadRequestException('code is required');

        // 確認 warehouse 存在（避免 FK 500）
        const wh = await this.prisma.nx00Warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } });
        if (!wh) throw new BadRequestException('Warehouse not found');

        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        try {
            const row = await this.prisma.nx00Location.create({
                data: {
                    warehouseId,
                    code,
                    name: body.name ?? null,

                    zone: body.zone ?? null,
                    rack: body.rack ?? null,
                    levelNo: body.levelNo ?? null,
                    binNo: body.binNo ?? null,

                    remark: body.remark ?? null,
                    sortNo,
                    isActive: body.isActive ?? true,

                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
                    warehouse: { select: { code: true, name: true } },
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（CREATE）
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_location',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create location ${row.code}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        warehouseId: row.warehouseId,
                        code: row.code,
                        name: row.name ?? null,
                        zone: row.zone ?? null,
                        rack: row.rack ?? null,
                        levelNo: row.levelNo ?? null,
                        binNo: row.binNo ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toLocationDto(row as unknown as LocationRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                // @@unique([warehouseId, code])
                throw new BadRequestException('此倉庫內庫位代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdateLocationBody, ctx?: LocationActionContext): Promise<LocationDto> {
        const exists = await this.prisma.nx00Location.findUnique({
            where: { id },
            select: {
                id: true,
                warehouseId: true,
                code: true,
                name: true,
                zone: true,
                rack: true,
                levelNo: true,
                binNo: true,
                remark: true,
                sortNo: true,
                isActive: true,
            },
        });
        if (!exists) throw new NotFoundException('Location not found');

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        if (typeof body.warehouseId === 'string') data.warehouseId = body.warehouseId.trim();
        if (typeof body.code === 'string') data.code = body.code.trim();
        if (body.name !== undefined) data.name = body.name ?? null;

        if (body.zone !== undefined) data.zone = body.zone ?? null;
        if (body.rack !== undefined) data.rack = body.rack ?? null;
        if (body.levelNo !== undefined) data.levelNo = body.levelNo ?? null;
        if (body.binNo !== undefined) data.binNo = body.binNo ?? null;

        if (body.remark !== undefined) data.remark = body.remark ?? null;

        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) {
                throw new BadRequestException('sortNo must be a number');
            }
            data.sortNo = body.sortNo;
        }

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        // 若 warehouseId 有更新，先確認存在
        if (data.warehouseId) {
            const wh = await this.prisma.nx00Warehouse.findUnique({
                where: { id: data.warehouseId },
                select: { id: true },
            });
            if (!wh) throw new BadRequestException('Warehouse not found');
        }

        try {
            const row = await this.prisma.nx00Location.update({
                where: { id },
                data,
                include: {
                    warehouse: { select: { code: true, name: true } },
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
                    entityTable: 'nx00_location',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update location ${row.code}`,
                    beforeData: {
                        id: exists.id,
                        warehouseId: exists.warehouseId,
                        code: exists.code,
                        name: exists.name ?? null,
                        zone: exists.zone ?? null,
                        rack: exists.rack ?? null,
                        levelNo: exists.levelNo ?? null,
                        binNo: exists.binNo ?? null,
                        remark: exists.remark ?? null,
                        sortNo: exists.sortNo,
                        isActive: Boolean(exists.isActive),
                    },
                    afterData: {
                        id: row.id,
                        warehouseId: row.warehouseId,
                        code: row.code,
                        name: row.name ?? null,
                        zone: row.zone ?? null,
                        rack: row.rack ?? null,
                        levelNo: row.levelNo ?? null,
                        binNo: row.binNo ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toLocationDto(row as unknown as LocationRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('此倉庫內庫位代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: LocationActionContext): Promise<LocationDto> {
        const exists = await this.prisma.nx00Location.findUnique({
            where: { id },
            select: { id: true, code: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Location not found');

        const row = await this.prisma.nx00Location.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: {
                warehouse: { select: { code: true, name: true } },
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
                entityTable: 'nx00_location',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set location ${row.code} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toLocationDto(row as unknown as LocationRowWithAudit);
    }
}