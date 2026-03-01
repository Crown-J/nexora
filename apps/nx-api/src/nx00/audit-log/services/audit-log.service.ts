/**
 * File: apps/nx-api/src/nx00/audit-log/services/audit-log.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-AUDIT-LOG-SVC-001：AuditLog Service（list/get + write）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_audit_log_id()
 * - actorUserId 必填（建議由 JWT 取得）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuditLogDto, CreateAuditLogBody, ListAuditLogQuery, PagedResult } from '../dto/audit-log.dto';

type AuditLogRow = {
    id: string;
    occurredAt: Date;

    actorUserId: string;
    actorUser?: { displayName: string } | null;

    moduleCode: string;
    action: string;
    entityTable: string;

    entityId: string | null;
    entityCode: string | null;
    summary: string | null;

    beforeData: any | null;
    afterData: any | null;

    ipAddr: string | null;
    userAgent: string | null;
};

function toAuditLogDto(row: AuditLogRow): AuditLogDto {
    return {
        id: row.id,
        occurredAt: row.occurredAt?.toISOString?.() ?? String(row.occurredAt),

        actorUserId: row.actorUserId,
        actorUserName: row.actorUser?.displayName ?? null,

        moduleCode: row.moduleCode,
        action: row.action,
        entityTable: row.entityTable,

        entityId: row.entityId ?? null,
        entityCode: row.entityCode ?? null,
        summary: row.summary ?? null,

        beforeData: row.beforeData ?? null,
        afterData: row.afterData ?? null,

        ipAddr: row.ipAddr ?? null,
        userAgent: row.userAgent ?? null,
    };
}

function parseDateOrThrow(v?: string, fieldName?: string): Date | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${fieldName ?? 'date'}`);
    return d;
}

@Injectable()
export class AuditLogService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListAuditLogQuery): Promise<PagedResult<AuditLogDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const dateFrom = parseDateOrThrow(query.dateFrom, 'dateFrom');
        const dateTo = parseDateOrThrow(query.dateTo, 'dateTo');

        const where: any = {};
        if (q) {
            where.OR = [
                { summary: { contains: q, mode: 'insensitive' as const } },
                { entityCode: { contains: q, mode: 'insensitive' as const } },
                { entityId: { contains: q, mode: 'insensitive' as const } },
                { entityTable: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (query.actorUserId) where.actorUserId = query.actorUserId;
        if (query.moduleCode) where.moduleCode = query.moduleCode;
        if (query.action) where.action = query.action;
        if (query.entityTable) where.entityTable = query.entityTable;

        if (dateFrom || dateTo) {
            where.occurredAt = {};
            if (dateFrom) where.occurredAt.gte = dateFrom;
            if (dateTo) where.occurredAt.lte = dateTo;
        }

        const [total, rows] = await Promise.all([
            this.prisma.nx00AuditLog.count({ where }),
            this.prisma.nx00AuditLog.findMany({
                where,
                orderBy: [{ occurredAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    actorUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as AuditLogRow[]).map(toAuditLogDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<AuditLogDto> {
        const row = await this.prisma.nx00AuditLog.findUnique({
            where: { id },
            include: { actorUser: { select: { displayName: true } } },
        });

        if (!row) throw new NotFoundException('AuditLog not found');
        return toAuditLogDto(row as unknown as AuditLogRow);
    }

    /**
     * （可選）Controller POST 用：手動寫入
     */
    async create(body: CreateAuditLogBody, actorUserId?: string, ipAddr?: string | null, userAgent?: string | null) {
        if (!actorUserId) throw new BadRequestException('actorUserId is required');

        const moduleCode = body.moduleCode?.trim();
        const action = body.action?.trim();
        const entityTable = body.entityTable?.trim();

        if (!moduleCode) throw new BadRequestException('moduleCode is required');
        if (!action) throw new BadRequestException('action is required');
        if (!entityTable) throw new BadRequestException('entityTable is required');

        const row = await this.prisma.nx00AuditLog.create({
            data: {
                actorUserId,
                moduleCode,
                action,
                entityTable,
                entityId: body.entityId ?? null,
                entityCode: body.entityCode ?? null,
                summary: body.summary ?? null,
                beforeData: body.beforeData ?? null,
                afterData: body.afterData ?? null,
                ipAddr: ipAddr ?? body.ipAddr ?? null,
                userAgent: userAgent ?? body.userAgent ?? null,
            },
            include: { actorUser: { select: { displayName: true } } },
        });

        return toAuditLogDto(row as unknown as AuditLogRow);
    }

    /**
     * ✅ 給其他 Service 用的「寫入 helper」
     * - 你在 Role/Brand/Part… create/update/setActive 完成後呼叫它即可
     */
    async write(args: {
        actorUserId: string;
        moduleCode: string;
        action: string;
        entityTable: string;
        entityId?: string | null;
        entityCode?: string | null;
        summary?: string | null;
        beforeData?: any | null;
        afterData?: any | null;
        ipAddr?: string | null;
        userAgent?: string | null;
    }): Promise<void> {
        const moduleCode = args.moduleCode?.trim();
        const action = args.action?.trim();
        const entityTable = args.entityTable?.trim();

        if (!args.actorUserId) throw new BadRequestException('actorUserId is required');
        if (!moduleCode) throw new BadRequestException('moduleCode is required');
        if (!action) throw new BadRequestException('action is required');
        if (!entityTable) throw new BadRequestException('entityTable is required');

        await this.prisma.nx00AuditLog.create({
            data: {
                actorUserId: args.actorUserId,
                moduleCode,
                action,
                entityTable,
                entityId: args.entityId ?? null,
                entityCode: args.entityCode ?? null,
                summary: args.summary ?? null,
                beforeData: args.beforeData ?? null,
                afterData: args.afterData ?? null,
                ipAddr: args.ipAddr ?? null,
                userAgent: args.userAgent ?? null,
            },
        });
    }
}