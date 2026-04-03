import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    BrandCodeRoleDto,
    CreateBrandCodeRoleBody,
    ListBrandCodeRoleQuery,
    PagedResult,
    SetActiveBody,
    UpdateBrandCodeRoleBody,
} from '../dto/brand-code-role.dto';

type Row = {
    id: string;
    tenantId: string;
    partBrandId: string;
    seg1Limit: number;
    seg2Limit: number;
    seg3Limit: number;
    seg4Limit: number;
    seg5Limit: number;
    codeFormat: string;
    brandSort: string;
    isActive: boolean;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    partBrand?: { code: string; name: string } | null;
    createdByUser?: { userAccount: string; userName: string } | null;
    updatedByUser?: { userAccount: string; userName: string } | null;
};

function toDto(row: Row): BrandCodeRoleDto {
    return {
        id: row.id,
        partBrandId: row.partBrandId,
        partBrandCode: row.partBrand?.code ?? null,
        partBrandName: row.partBrand?.name ?? null,
        seg1: row.seg1Limit,
        seg2: row.seg2Limit,
        seg3: row.seg3Limit,
        seg4: row.seg4Limit,
        seg5: row.seg5Limit,
        codeFormat: row.codeFormat,
        brandSort: row.brandSort,
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

export type BrandCodeRoleActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

export type BrandCodeRoleReadScope = { tenantScopeId?: string | null };

@Injectable()
export class BrandCodeRoleService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    private include() {
        return {
            partBrand: { select: { code: true, name: true } },
            createdByUser: { select: { userAccount: true, userName: true } },
            updatedByUser: { select: { userAccount: true, userName: true } },
        } as const;
    }

    async list(query: ListBrandCodeRoleQuery, scope?: BrandCodeRoleReadScope): Promise<PagedResult<BrandCodeRoleDto>> {
        const page = Number(query.page) > 0 ? Number(query.page) : 1;
        const pageSize = Number(query.pageSize) > 0 ? Number(query.pageSize) : 50;
        const q = query.q?.trim();
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        const parts: any[] = [];
        if (tid !== null) parts.push({ tenantId: tid });
        if (q) {
            parts.push({
                OR: [
                    { codeFormat: { contains: q, mode: 'insensitive' as const } },
                    { brandSort: { contains: q, mode: 'insensitive' as const } },
                    { partBrand: { code: { contains: q, mode: 'insensitive' as const } } },
                    { partBrand: { name: { contains: q, mode: 'insensitive' as const } } },
                ],
            });
        }
        if (typeof query.isActive === 'boolean') parts.push({ isActive: query.isActive });
        const where = parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { AND: parts };

        const [total, rows] = await Promise.all([
            this.prisma.nx00BrandCodeRole.count({ where }),
            this.prisma.nx00BrandCodeRole.findMany({
                where,
                orderBy: [{ partBrand: { code: 'asc' } }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.include(),
            }),
        ]);

        return { items: rows.map((r) => toDto(r as Row)), page, pageSize, total };
    }

    async get(id: string, scope?: BrandCodeRoleReadScope): Promise<BrandCodeRoleDto> {
        const row = await this.prisma.nx00BrandCodeRole.findUnique({
            where: { id },
            include: this.include(),
        });
        if (!row) throw new NotFoundException('Brand code role not found');
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        if (tid !== null && row.tenantId !== tid) throw new NotFoundException('Brand code role not found');
        return toDto(row as Row);
    }

    async create(body: CreateBrandCodeRoleBody, ctx?: BrandCodeRoleActionContext): Promise<BrandCodeRoleDto> {
        const partBrandId = body.partBrandId?.trim();
        if (!partBrandId) throw new BadRequestException('partBrandId is required');
        const b = await this.prisma.nx00PartBrand.findUnique({
            where: { id: partBrandId },
            select: { id: true, tenantId: true },
        });
        if (!b) throw new BadRequestException('Part brand not found');

        const codeFormat = body.codeFormat?.trim();
        const brandSort = body.brandSort?.trim();
        if (!codeFormat) throw new BadRequestException('codeFormat is required');
        if (!brandSort) throw new BadRequestException('brandSort is required');

        const n = (v: unknown, d: number) =>
            typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d;

        try {
            const row = await this.prisma.nx00BrandCodeRole.create({
                data: {
                    tenantId: b.tenantId,
                    partBrandId,
                    seg1Limit: n(body.seg1, 0),
                    seg2Limit: n(body.seg2, 0),
                    seg3Limit: n(body.seg3, 0),
                    seg4Limit: n(body.seg4, 0),
                    seg5Limit: n(body.seg5, 0),
                    codeFormat,
                    brandSort,
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
                    entityTable: 'nx00_brand_code_role',
                    entityId: row.id,
                    entityCode: row.partBrandId,
                    summary: 'Create brand code role',
                    beforeData: null,
                    afterData: toDto(row as Row),
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }
            return toDto(row as Row);
        } catch (e: any) {
            if (e?.code === 'P2002') throw new BadRequestException('該零件品牌已有料號規則');
            throw e;
        }
    }

    async update(id: string, body: UpdateBrandCodeRoleBody, ctx?: BrandCodeRoleActionContext): Promise<BrandCodeRoleDto> {
        const exists = await this.prisma.nx00BrandCodeRole.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Brand code role not found');

        const data: any = { updatedBy: ctx?.actorUserId ?? null };
        const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : undefined);
        if (body.seg1 !== undefined) data.seg1Limit = n(body.seg1);
        if (body.seg2 !== undefined) data.seg2Limit = n(body.seg2);
        if (body.seg3 !== undefined) data.seg3Limit = n(body.seg3);
        if (body.seg4 !== undefined) data.seg4Limit = n(body.seg4);
        if (body.seg5 !== undefined) data.seg5Limit = n(body.seg5);
        if (body.codeFormat !== undefined) data.codeFormat = body.codeFormat.trim();
        if (body.brandSort !== undefined) data.brandSort = body.brandSort.trim();
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        const row = await this.prisma.nx00BrandCodeRole.update({
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
                entityTable: 'nx00_brand_code_role',
                entityId: row.id,
                entityCode: row.partBrandId,
                summary: 'Update brand code role',
                beforeData: toDto(exists as Row),
                afterData: toDto(row as Row),
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }

    async setActive(id: string, body: SetActiveBody, ctx?: BrandCodeRoleActionContext): Promise<BrandCodeRoleDto> {
        const exists = await this.prisma.nx00BrandCodeRole.findUnique({
            where: { id },
            select: { id: true, tenantId: true, partBrandId: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Brand code role not found');
        const row = await this.prisma.nx00BrandCodeRole.update({
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
                entityTable: 'nx00_brand_code_role',
                entityId: row.id,
                entityCode: row.partBrandId,
                summary: `Set brand code role active=${body.isActive}`,
                beforeData: { isActive: exists.isActive },
                afterData: { isActive: row.isActive },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }
}
