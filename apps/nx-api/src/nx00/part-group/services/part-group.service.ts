import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreatePartGroupBody,
    ListPartGroupQuery,
    PagedResult,
    PartGroupDto,
    SetActiveBody,
    UpdatePartGroupBody,
} from '../dto/part-group.dto';

type PrismaKnownError = { code?: string; message?: string };

type Row = {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    sortNo: number;
    isActive: boolean;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    createdByUser?: { userAccount: string; userName: string } | null;
    updatedByUser?: { userAccount: string; userName: string } | null;
};

function toDto(row: Row): PartGroupDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        sortNo: row.sortNo,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByUsername: row.createdByUser?.userAccount ?? null,
        createdByName: row.createdByUser?.userName ?? null,
        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByUsername: row.updatedByUser?.userAccount ?? null,
        updatedByName: row.updatedByUser?.userName ?? null,
    };
}

export type PartGroupActionContext = {
    actorUserId?: string;
    tenantId?: string | null;
    ipAddr?: string | null;
    userAgent?: string | null;
};

export type PartGroupReadScope = { tenantScopeId?: string | null };

@Injectable()
export class PartGroupService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    private include() {
        return {
            createdByUser: { select: { userAccount: true, userName: true } },
            updatedByUser: { select: { userAccount: true, userName: true } },
        } as const;
    }

    async list(query: ListPartGroupQuery, scope?: PartGroupReadScope): Promise<PagedResult<PartGroupDto>> {
        const page = Number(query.page) > 0 ? Number(query.page) : 1;
        const pageSize = Number(query.pageSize) > 0 ? Number(query.pageSize) : 50;
        const q = query.q?.trim();
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        const parts: any[] = [];
        if (tid !== null) parts.push({ tenantId: tid });
        if (q) {
            parts.push({
                OR: [
                    { code: { contains: q, mode: 'insensitive' as const } },
                    { name: { contains: q, mode: 'insensitive' as const } },
                ],
            });
        }
        if (typeof query.isActive === 'boolean') parts.push({ isActive: query.isActive });
        const where = parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { AND: parts };

        const [total, rows] = await Promise.all([
            this.prisma.nx00PartGroup.count({ where }),
            this.prisma.nx00PartGroup.findMany({
                where,
                orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.include(),
            }),
        ]);

        return { items: rows.map((r) => toDto(r as Row)), page, pageSize, total };
    }

    async get(id: string, scope?: PartGroupReadScope): Promise<PartGroupDto> {
        const row = await this.prisma.nx00PartGroup.findUnique({ where: { id }, include: this.include() });
        if (!row) throw new NotFoundException('Part group not found');
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        if (tid !== null && row.tenantId !== tid) throw new NotFoundException('Part group not found');
        return toDto(row as Row);
    }

    async create(body: CreatePartGroupBody, ctx?: PartGroupActionContext): Promise<PartGroupDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();
        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');
        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        const tid =
            (typeof body.tenantId === 'string' && body.tenantId.trim() !== '' ? body.tenantId.trim() : null) ??
            ctx?.tenantId ??
            null;
        if (!tid) throw new BadRequestException('tenantId is required');

        try {
            const row = await this.prisma.nx00PartGroup.create({
                data: {
                    tenantId: tid,
                    code,
                    name,
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
                    tenantId: row.tenantId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_part_group',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create part group ${row.code}`,
                    beforeData: null,
                    afterData: { code: row.code, name: row.name, sortNo: row.sortNo, isActive: row.isActive },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }
            return toDto(row as Row);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') throw new BadRequestException('族群代碼已存在');
            throw e;
        }
    }

    async update(id: string, body: UpdatePartGroupBody, ctx?: PartGroupActionContext): Promise<PartGroupDto> {
        const exists = await this.prisma.nx00PartGroup.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Part group not found');

        const data: any = { updatedBy: ctx?.actorUserId ?? null };
        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) throw new BadRequestException('sortNo invalid');
            data.sortNo = body.sortNo;
        }
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00PartGroup.update({
                where: { id },
                data,
                include: this.include(),
            });
            if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                tenantId: row.tenantId,
                moduleCode: 'NX00',
                action: 'UPDATE',
                entityTable: 'nx00_part_group',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update part group ${row.code}`,
                    beforeData: {
                        code: exists.code,
                        name: exists.name,
                        sortNo: exists.sortNo,
                        isActive: exists.isActive,
                    },
                    afterData: {
                        code: row.code,
                        name: row.name,
                        sortNo: row.sortNo,
                        isActive: row.isActive,
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }
            return toDto(row as Row);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') throw new BadRequestException('族群代碼已存在');
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: PartGroupActionContext): Promise<PartGroupDto> {
        const exists = await this.prisma.nx00PartGroup.findUnique({
            where: { id },
            select: { id: true, code: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Part group not found');
        const row = await this.prisma.nx00PartGroup.update({
            where: { id },
            data: { isActive: Boolean(body.isActive), updatedBy: ctx?.actorUserId ?? null },
            include: this.include(),
        });
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                tenantId: row.tenantId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_part_group',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set part group ${row.code} active=${body.isActive}`,
                beforeData: { isActive: exists.isActive },
                afterData: { isActive: row.isActive },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }
}
