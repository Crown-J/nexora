/**
 * File: apps/nx-api/src/nx00/brand/services/brand.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-SVC-001：Brand Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_brand_id()
 * - code UNIQUE（P2002）
 * - 為寫入 AuditLog，Controller 會傳入 ctx（actorUserId/ipAddr/userAgent）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    BrandDto,
    CreateBrandBody,
    ListBrandQuery,
    PagedResult,
    SetActiveBody,
    UpdateBrandBody,
} from '../dto/brand.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type BrandRowWithAudit = {
    id: string;
    code: string;
    name: string;
    originCountry: string | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toBrandDto(row: BrandRowWithAudit): BrandDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        originCountry: row.originCountry ?? null,
        remark: row.remark ?? null,
        isActive: Boolean(row.isActive),
        sortNo: Number.isFinite(row.sortNo as any) ? Number(row.sortNo) : 0,

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

/**
 * Brand Action Context（用於 AuditLog）
 */
export type BrandActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class BrandService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListBrandQuery): Promise<PagedResult<BrandDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { originCountry: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Brand.count({ where }),
            this.prisma.nx00Brand.findMany({
                where,
                orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as BrandRowWithAudit[]).map(toBrandDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<BrandDto> {
        const row = await this.prisma.nx00Brand.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Brand not found');
        return toBrandDto(row as unknown as BrandRowWithAudit);
    }

    async create(body: CreateBrandBody, ctx?: BrandActionContext): Promise<BrandDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;

        try {
            const row = await this.prisma.nx00Brand.create({
                data: {
                    code,
                    name,
                    originCountry: body.originCountry ?? null,
                    remark: body.remark ?? null,
                    sortNo,
                    isActive: body.isActive ?? true,

                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
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
                    entityTable: 'nx00_brand',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create brand ${row.code}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        originCountry: row.originCountry ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toBrandDto(row as unknown as BrandRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('品牌代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdateBrandBody, ctx?: BrandActionContext): Promise<BrandDto> {
        const exists = await this.prisma.nx00Brand.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                name: true,
                originCountry: true,
                remark: true,
                isActive: true,
                sortNo: true,
            },
        });
        if (!exists) throw new NotFoundException('Brand not found');

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.originCountry !== undefined) data.originCountry = body.originCountry ?? null;
        if (body.remark !== undefined) data.remark = body.remark ?? null;

        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) {
                throw new BadRequestException('sortNo must be a number');
            }
            data.sortNo = body.sortNo;
        }

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00Brand.update({
                where: { id },
                data,
                include: {
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
                    entityTable: 'nx00_brand',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update brand ${row.code}`,
                    beforeData: {
                        id: exists.id,
                        code: exists.code,
                        name: exists.name,
                        originCountry: exists.originCountry ?? null,
                        remark: exists.remark ?? null,
                        sortNo: exists.sortNo,
                        isActive: Boolean(exists.isActive),
                    },
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        originCountry: row.originCountry ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toBrandDto(row as unknown as BrandRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('品牌代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: BrandActionContext): Promise<BrandDto> {
        const exists = await this.prisma.nx00Brand.findUnique({
            where: { id },
            select: { id: true, code: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Brand not found');

        const row = await this.prisma.nx00Brand.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: {
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
                entityTable: 'nx00_brand',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set brand ${row.code} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toBrandDto(row as unknown as BrandRowWithAudit);
    }
}