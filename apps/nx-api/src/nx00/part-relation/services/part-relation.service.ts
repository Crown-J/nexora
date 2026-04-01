import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreatePartRelationBody,
    ListPartRelationQuery,
    PagedResult,
    PartRelationDto,
    PartRelationType,
    SetActiveBody,
    UpdatePartRelationBody,
} from '../dto/part-relation.dto';

const ALLOWED = new Set<PartRelationType>(['S', 'R', 'C', 'B', 'F']);

type Row = {
    id: string;
    partIdFrom: string;
    partIdTo: string;
    relationType: string;
    remark: string | null;
    sortNo: number;
    isActive: boolean;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    partFrom?: { code: string; name: string } | null;
    partTo?: { code: string; name: string } | null;
    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toDto(row: Row): PartRelationDto {
    return {
        id: row.id,
        partIdFrom: row.partIdFrom,
        partIdTo: row.partIdTo,
        partCodeFrom: row.partFrom?.code ?? null,
        partNameFrom: row.partFrom?.name ?? null,
        partCodeTo: row.partTo?.code ?? null,
        partNameTo: row.partTo?.name ?? null,
        relationType: row.relationType as PartRelationType,
        remark: row.remark ?? null,
        sortNo: row.sortNo,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,
        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

export type PartRelationActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class PartRelationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    private include() {
        return {
            partFrom: { select: { code: true, name: true } },
            partTo: { select: { code: true, name: true } },
            createdByUser: { select: { displayName: true } },
            updatedByUser: { select: { displayName: true } },
        } as const;
    }

    private assertType(t: string): PartRelationType {
        const u = String(t).trim().toUpperCase();
        if (!ALLOWED.has(u as PartRelationType)) {
            throw new BadRequestException('relationType must be S, R, C, B, or F');
        }
        return u as PartRelationType;
    }

    private async assertPart(id: string | undefined | null): Promise<void> {
        if (!id?.trim()) throw new BadRequestException('part id required');
        const p = await this.prisma.nx00Part.findUnique({ where: { id: id.trim() }, select: { id: true } });
        if (!p) throw new BadRequestException('Part not found');
    }

    async list(query: ListPartRelationQuery): Promise<PagedResult<PartRelationDto>> {
        const page = Number(query.page) > 0 ? Number(query.page) : 1;
        const pageSize = Number(query.pageSize) > 0 ? Number(query.pageSize) : 50;
        const q = query.q?.trim();
        const where: any = {};
        if (q) {
            where.OR = [
                { remark: { contains: q, mode: 'insensitive' as const } },
                { partFrom: { code: { contains: q, mode: 'insensitive' as const } } },
                { partFrom: { name: { contains: q, mode: 'insensitive' as const } } },
                { partTo: { code: { contains: q, mode: 'insensitive' as const } } },
                { partTo: { name: { contains: q, mode: 'insensitive' as const } } },
            ];
        }
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00PartRelation.count({ where }),
            this.prisma.nx00PartRelation.findMany({
                where,
                orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.include(),
            }),
        ]);

        return { items: rows.map((r) => toDto(r as Row)), page, pageSize, total };
    }

    async get(id: string): Promise<PartRelationDto> {
        const row = await this.prisma.nx00PartRelation.findUnique({
            where: { id },
            include: this.include(),
        });
        if (!row) throw new NotFoundException('Part relation not found');
        return toDto(row as Row);
    }

    async create(body: CreatePartRelationBody, ctx?: PartRelationActionContext): Promise<PartRelationDto> {
        const partIdFrom = body.partIdFrom?.trim();
        const partIdTo = body.partIdTo?.trim();
        if (!partIdFrom || !partIdTo) throw new BadRequestException('partIdFrom and partIdTo required');
        if (partIdFrom === partIdTo) throw new BadRequestException('partIdFrom and partIdTo must differ');
        await this.assertPart(partIdFrom);
        await this.assertPart(partIdTo);
        const relationType = this.assertType(body.relationType);
        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        const row = await this.prisma.nx00PartRelation.create({
            data: {
                partIdFrom,
                partIdTo,
                relationType,
                remark: body.remark?.trim() || null,
                sortNo,
                isActive: body.isActive ?? true,
                createdBy: ctx?.actorUserId ?? null,
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: this.include(),
        });
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'CREATE',
                entityTable: 'nx00_part_relation',
                entityId: row.id,
                entityCode: `${partIdFrom}->${partIdTo}`,
                summary: 'Create part relation',
                beforeData: null,
                afterData: toDto(row as Row),
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }

    async update(id: string, body: UpdatePartRelationBody, ctx?: PartRelationActionContext): Promise<PartRelationDto> {
        const exists = await this.prisma.nx00PartRelation.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Part relation not found');

        const data: any = { updatedBy: ctx?.actorUserId ?? null };
        if (body.partIdFrom !== undefined) {
            const v = body.partIdFrom?.trim();
            if (!v) throw new BadRequestException('partIdFrom empty');
            await this.assertPart(v);
            data.partIdFrom = v;
        }
        if (body.partIdTo !== undefined) {
            const v = body.partIdTo?.trim();
            if (!v) throw new BadRequestException('partIdTo empty');
            await this.assertPart(v);
            data.partIdTo = v;
        }
        if (body.relationType !== undefined) data.relationType = this.assertType(body.relationType);
        if (body.remark !== undefined) data.remark = body.remark?.trim() || null;
        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) throw new BadRequestException('sortNo invalid');
            data.sortNo = body.sortNo;
        }
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        const from = data.partIdFrom ?? exists.partIdFrom;
        const to = data.partIdTo ?? exists.partIdTo;
        if (from === to) throw new BadRequestException('partIdFrom and partIdTo must differ');

        const row = await this.prisma.nx00PartRelation.update({
            where: { id },
            data,
            include: this.include(),
        });
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'UPDATE',
                entityTable: 'nx00_part_relation',
                entityId: row.id,
                entityCode: `${row.partIdFrom}->${row.partIdTo}`,
                summary: 'Update part relation',
                beforeData: toDto(exists as Row),
                afterData: toDto(row as Row),
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }

    async setActive(id: string, body: SetActiveBody, ctx?: PartRelationActionContext): Promise<PartRelationDto> {
        const exists = await this.prisma.nx00PartRelation.findUnique({
            where: { id },
            select: { id: true, partIdFrom: true, partIdTo: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Part relation not found');
        const row = await this.prisma.nx00PartRelation.update({
            where: { id },
            data: { isActive: Boolean(body.isActive), updatedBy: ctx?.actorUserId ?? null },
            include: this.include(),
        });
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_part_relation',
                entityId: row.id,
                entityCode: `${exists.partIdFrom}->${exists.partIdTo}`,
                summary: `Set part relation active=${body.isActive}`,
                beforeData: { isActive: exists.isActive },
                afterData: { isActive: row.isActive },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }
}
