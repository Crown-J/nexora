import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    BrandCodeRuleDto,
    CreateBrandCodeRuleBody,
    ListBrandCodeRuleQuery,
    PagedResult,
    SetActiveBody,
    UpdateBrandCodeRuleBody,
} from '../dto/brand-code-rule.dto';

type Row = {
    id: string;
    tenantId: string;
    partBrandId: string;
    name: string;
    seg1: number;
    seg2: number;
    seg3: number;
    seg4: number;
    seg5: number;
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

function toDto(row: Row): BrandCodeRuleDto {
    return {
        id: row.id,
        partBrandId: row.partBrandId,
        name: row.name,
        partBrandCode: row.partBrand?.code ?? null,
        partBrandName: row.partBrand?.name ?? null,
        seg1: row.seg1,
        seg2: row.seg2,
        seg3: row.seg3,
        seg4: row.seg4,
        seg5: row.seg5,
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

export type BrandCodeRuleActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

export type BrandCodeRuleReadScope = { tenantScopeId?: string | null };

@Injectable()
export class BrandCodeRuleService {
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

    async list(query: ListBrandCodeRuleQuery, scope?: BrandCodeRuleReadScope): Promise<PagedResult<BrandCodeRuleDto>> {
        const page = Number(query.page) > 0 ? Number(query.page) : 1;
        const pageSize = Number(query.pageSize) > 0 ? Number(query.pageSize) : 50;
        const q = query.q?.trim();
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        const parts: any[] = [];
        if (tid !== null) parts.push({ tenantId: tid });
        if (q) {
            parts.push({
                OR: [
                    { name: { contains: q, mode: 'insensitive' as const } },
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
            this.prisma.nx00BrandCodeRule.count({ where }),
            this.prisma.nx00BrandCodeRule.findMany({
                where,
                orderBy: [{ partBrand: { code: 'asc' } }, { name: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.include(),
            }),
        ]);

        return { items: rows.map((r) => toDto(r as Row)), page, pageSize, total };
    }

    async get(id: string, scope?: BrandCodeRuleReadScope): Promise<BrandCodeRuleDto> {
        const row = await this.prisma.nx00BrandCodeRule.findUnique({
            where: { id },
            include: this.include(),
        });
        if (!row) throw new NotFoundException('Brand code rule not found');
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        if (tid !== null && row.tenantId !== tid) throw new NotFoundException('Brand code rule not found');
        return toDto(row as Row);
    }

    async create(body: CreateBrandCodeRuleBody, ctx?: BrandCodeRuleActionContext): Promise<BrandCodeRuleDto> {
        const partBrandId = body.partBrandId?.trim();
        if (!partBrandId) throw new BadRequestException('partBrandId is required');
        const name = body.name?.trim();
        if (!name) throw new BadRequestException('name is required');
        if (name.length > 15) throw new BadRequestException('name max length is 15');

        const b = await this.prisma.nx00PartBrand.findUnique({
            where: { id: partBrandId },
            select: { id: true, tenantId: true },
        });
        if (!b) throw new BadRequestException('Part brand not found');

        const codeFormat = (body.codeFormat?.trim() || '1-2-3-4-5').slice(0, 20);
        const brandSort = (body.brandSort?.trim() || '12345').slice(0, 5);

        const n = (v: unknown, d: number) =>
            typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d;

        const row = await this.prisma.nx00BrandCodeRule.create({
            data: {
                tenantId: b.tenantId,
                partBrandId,
                name,
                seg1: n(body.seg1, 0),
                seg2: n(body.seg2, 0),
                seg3: n(body.seg3, 0),
                seg4: n(body.seg4, 0),
                seg5: n(body.seg5, 0),
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
                entityTable: 'nx00_brand_code_rule',
                entityId: row.id,
                entityCode: row.name,
                summary: 'Create brand code rule',
                beforeData: null,
                afterData: toDto(row as Row),
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }

    async update(id: string, body: UpdateBrandCodeRuleBody, ctx?: BrandCodeRuleActionContext): Promise<BrandCodeRuleDto> {
        const exists = await this.prisma.nx00BrandCodeRule.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Brand code rule not found');

        const data: any = { updatedBy: ctx?.actorUserId ?? null };
        const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : undefined);
        if (body.name !== undefined) {
            const nm = body.name.trim();
            if (!nm) throw new BadRequestException('name cannot be empty');
            if (nm.length > 15) throw new BadRequestException('name max length is 15');
            data.name = nm;
        }
        if (body.seg1 !== undefined) data.seg1 = n(body.seg1);
        if (body.seg2 !== undefined) data.seg2 = n(body.seg2);
        if (body.seg3 !== undefined) data.seg3 = n(body.seg3);
        if (body.seg4 !== undefined) data.seg4 = n(body.seg4);
        if (body.seg5 !== undefined) data.seg5 = n(body.seg5);
        if (body.codeFormat !== undefined) data.codeFormat = body.codeFormat.trim().slice(0, 20);
        if (body.brandSort !== undefined) data.brandSort = body.brandSort.trim().slice(0, 5);
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        const row = await this.prisma.nx00BrandCodeRule.update({
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
                entityTable: 'nx00_brand_code_rule',
                entityId: row.id,
                entityCode: row.name,
                summary: 'Update brand code rule',
                beforeData: toDto(exists as Row),
                afterData: toDto(row as Row),
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }

    async setActive(id: string, body: SetActiveBody, ctx?: BrandCodeRuleActionContext): Promise<BrandCodeRuleDto> {
        const exists = await this.prisma.nx00BrandCodeRule.findUnique({
            where: { id },
            select: { id: true, tenantId: true, partBrandId: true, name: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Brand code rule not found');
        const row = await this.prisma.nx00BrandCodeRule.update({
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
                entityTable: 'nx00_brand_code_rule',
                entityId: row.id,
                entityCode: row.name,
                summary: `Set brand code rule active=${body.isActive}`,
                beforeData: { isActive: exists.isActive },
                afterData: { isActive: row.isActive },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }
        return toDto(row as Row);
    }
}
