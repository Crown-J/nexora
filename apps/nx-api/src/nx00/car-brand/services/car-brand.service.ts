import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CarBrandDto,
    CreateCarBrandBody,
    ListCarBrandQuery,
    PagedResult,
    SetActiveBody,
    UpdateCarBrandBody,
} from '../dto/car-brand.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

type Row = {
    id: string;
    code: string;
    name: string;
    countryId: string | null;
    country?: { code: string; name: string } | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;
    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;
    createdByUser?: { userAccount: string; userName: string } | null;
    updatedByUser?: { userAccount: string; userName: string } | null;
};

function toDto(row: Row): CarBrandDto {
    const ccode = row.country?.code ?? null;
    const cname = row.country?.name ?? null;
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        countryId: row.countryId ?? null,
        countryCode: ccode,
        countryName: cname,
        originCountry: ccode,
        remark: row.remark ?? null,
        isActive: Boolean(row.isActive),
        sortNo: Number.isFinite(row.sortNo as any) ? Number(row.sortNo) : 0,
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

export type CarBrandActionContext = {
    actorUserId?: string;
    tenantId?: string | null;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class CarBrandService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) {}

    private include() {
        return {
            country: { select: { code: true, name: true } },
            createdByUser: { select: { userAccount: true, userName: true } },
            updatedByUser: { select: { userAccount: true, userName: true } },
        } as const;
    }

    private async resolveCountryId(
        countryId: string | null | undefined,
        originCountry: string | null | undefined,
    ): Promise<string | null> {
        if (countryId !== undefined && countryId !== null && String(countryId).trim() !== '') {
            const id = String(countryId).trim();
            const ok = await this.prisma.nx00Country.findUnique({ where: { id }, select: { id: true } });
            if (!ok) throw new BadRequestException('Country not found');
            return id;
        }
        if (countryId === null) return null;
        const o = originCountry?.trim();
        if (!o) return null;
        let code = o.toUpperCase();
        if (code === 'DE') code = 'DEU';
        if (code === 'TW') code = 'TWN';
        const c = await this.prisma.nx00Country.findUnique({ where: { code }, select: { id: true } });
        if (!c) throw new BadRequestException(`Country code not in master: ${code}`);
        return c.id;
    }

    async list(query: ListCarBrandQuery): Promise<PagedResult<CarBrandDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 50;
        const q = query.q?.trim() ? query.q.trim() : undefined;
        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { country: { code: { contains: q, mode: 'insensitive' as const } } },
                { country: { name: { contains: q, mode: 'insensitive' as const } } },
            ];
        }
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00CarBrand.count({ where }),
            this.prisma.nx00CarBrand.findMany({
                where,
                orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.include(),
            }),
        ]);

        return { items: rows.map((r) => toDto(r as Row)), page, pageSize, total };
    }

    async get(id: string): Promise<CarBrandDto> {
        const row = await this.prisma.nx00CarBrand.findUnique({
            where: { id },
            include: this.include(),
        });
        if (!row) throw new NotFoundException('Car brand not found');
        return toDto(row as Row);
    }

    async create(body: CreateCarBrandBody, ctx?: CarBrandActionContext): Promise<CarBrandDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();
        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');
        const sortNo = typeof body.sortNo === 'number' && Number.isFinite(body.sortNo) ? body.sortNo : 0;
        const cid = await this.resolveCountryId(body.countryId ?? undefined, body.originCountry ?? undefined);

        const tid =
            (typeof body.tenantId === 'string' && body.tenantId.trim() !== '' ? body.tenantId.trim() : null) ??
            ctx?.tenantId ??
            null;
        if (!tid) throw new BadRequestException('tenantId is required');

        try {
            const row = await this.prisma.nx00CarBrand.create({
                data: {
                    tenantId: tid,
                    code,
                    name,
                    countryId: cid,
                    remark: body.remark ?? null,
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
                    entityTable: 'nx00_car_brand',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create car brand ${row.code}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        countryId: row.countryId ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toDto(row as Row);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') throw new BadRequestException('汽車廠牌代碼已存在');
            throw e;
        }
    }

    async update(id: string, body: UpdateCarBrandBody, ctx?: CarBrandActionContext): Promise<CarBrandDto> {
        const exists = await this.prisma.nx00CarBrand.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                name: true,
                countryId: true,
                remark: true,
                isActive: true,
                sortNo: true,
            },
        });
        if (!exists) throw new NotFoundException('Car brand not found');

        const data: any = { updatedBy: ctx?.actorUserId ?? null };
        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.countryId !== undefined || body.originCountry !== undefined) {
            data.countryId = await this.resolveCountryId(
                body.countryId,
                body.originCountry !== undefined ? body.originCountry : undefined,
            );
        }
        if (body.remark !== undefined) data.remark = body.remark ?? null;
        if (body.sortNo !== undefined) {
            if (typeof body.sortNo !== 'number' || !Number.isFinite(body.sortNo)) {
                throw new BadRequestException('sortNo must be a number');
            }
            data.sortNo = body.sortNo;
        }
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00CarBrand.update({
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
                    entityTable: 'nx00_car_brand',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update car brand ${row.code}`,
                    beforeData: { ...exists },
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        countryId: row.countryId ?? null,
                        remark: row.remark ?? null,
                        sortNo: row.sortNo,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toDto(row as Row);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') throw new BadRequestException('汽車廠牌代碼已存在');
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: CarBrandActionContext): Promise<CarBrandDto> {
        const exists = await this.prisma.nx00CarBrand.findUnique({
            where: { id },
            select: { id: true, code: true, isActive: true },
        });
        if (!exists) throw new NotFoundException('Car brand not found');

        const row = await this.prisma.nx00CarBrand.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: this.include(),
        });

        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                tenantId: row.tenantId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_car_brand',
                entityId: row.id,
                entityCode: row.code,
                summary: `Set car brand ${row.code} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toDto(row as Row);
    }
}
