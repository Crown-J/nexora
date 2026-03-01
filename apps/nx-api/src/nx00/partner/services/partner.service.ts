/**
 * File: apps/nx-api/src/nx00/partner/services/partner.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-SVC-001：Partner Service（CRUD + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_partner_id()
 * - code UNIQUE（P2002）
 * - 需寫入 AuditLog：CREATE / UPDATE / SET_ACTIVE
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

import { AuditLogService } from '../../audit-log/services/audit-log.service';

import type {
    CreatePartnerBody,
    ListPartnerQuery,
    PagedResult,
    PartnerDto,
    PartnerType,
    SetActiveBody,
    UpdatePartnerBody,
} from '../dto/partner.dto';

type PrismaKnownError = { code?: string; meta?: any; message?: string };

export type AuditActor = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

const ALLOWED_PARTNER_TYPES: PartnerType[] = ['BOTH', 'CUSTOMER', 'SUPPLIER'];

function normalizePartnerType(v: any): PartnerType {
    const s = String(v ?? '').trim().toUpperCase();
    if ((ALLOWED_PARTNER_TYPES as string[]).includes(s)) return s as PartnerType;
    throw new BadRequestException(`partnerType must be one of: ${ALLOWED_PARTNER_TYPES.join(', ')}`);
}

type PartnerRowWithAudit = {
    id: string;
    code: string;
    name: string;
    partnerType: string;

    contactName: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    address: string | null;
    remark: string | null;

    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toPartnerDto(row: PartnerRowWithAudit): PartnerDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        partnerType: (String(row.partnerType).toUpperCase() as PartnerType) ?? 'BOTH',

        contactName: row.contactName ?? null,
        phone: row.phone ?? null,
        mobile: row.mobile ?? null,
        email: row.email ?? null,
        address: row.address ?? null,
        remark: row.remark ?? null,

        isActive: Boolean(row.isActive),

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

@Injectable()
export class PartnerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListPartnerQuery): Promise<PagedResult<PartnerDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
                { contactName: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q, mode: 'insensitive' as const } },
                { mobile: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
            ];
        }
        if (query.partnerType) where.partnerType = normalizePartnerType(query.partnerType);
        if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

        const [total, rows] = await Promise.all([
            this.prisma.nx00Partner.count({ where }),
            this.prisma.nx00Partner.findMany({
                where,
                orderBy: [{ code: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            }),
        ]);

        return {
            items: (rows as unknown as PartnerRowWithAudit[]).map(toPartnerDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<PartnerDto> {
        const row = await this.prisma.nx00Partner.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Partner not found');
        return toPartnerDto(row as unknown as PartnerRowWithAudit);
    }

    async create(body: CreatePartnerBody, actor?: AuditActor): Promise<PartnerDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        const partnerType = body.partnerType ? normalizePartnerType(body.partnerType) : ('BOTH' as PartnerType);

        try {
            const row = await this.prisma.nx00Partner.create({
                data: {
                    code,
                    name,
                    partnerType,

                    contactName: body.contactName ?? null,
                    phone: body.phone ?? null,
                    mobile: body.mobile ?? null,
                    email: body.email ?? null,
                    address: body.address ?? null,
                    remark: body.remark ?? null,

                    isActive: body.isActive ?? true,

                    createdBy: actor?.actorUserId ?? null,
                    updatedBy: actor?.actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（CREATE）：若沒有 actorUserId（例如系統 seed/批次），就不寫
            if (actor?.actorUserId) {
                await this.audit.write({
                    actorUserId: actor.actorUserId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_partner',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Create partner ${row.code}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        partnerType: row.partnerType,
                        contactName: row.contactName ?? null,
                        phone: row.phone ?? null,
                        mobile: row.mobile ?? null,
                        email: row.email ?? null,
                        address: row.address ?? null,
                        remark: row.remark ?? null,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: actor.ipAddr ?? null,
                    userAgent: actor.userAgent ?? null,
                });
            }

            return toPartnerDto(row as unknown as PartnerRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('交易夥伴代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdatePartnerBody, actor?: AuditActor): Promise<PartnerDto> {
        const exists = await this.prisma.nx00Partner.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Partner not found');

        const data: any = {
            updatedBy: actor?.actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.partnerType !== undefined) data.partnerType = normalizePartnerType(body.partnerType);

        if (body.contactName !== undefined) data.contactName = body.contactName ?? null;
        if (body.phone !== undefined) data.phone = body.phone ?? null;
        if (body.mobile !== undefined) data.mobile = body.mobile ?? null;
        if (body.email !== undefined) data.email = body.email ?? null;
        if (body.address !== undefined) data.address = body.address ?? null;
        if (body.remark !== undefined) data.remark = body.remark ?? null;

        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00Partner.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（UPDATE）
            if (actor?.actorUserId) {
                await this.audit.write({
                    actorUserId: actor.actorUserId,
                    moduleCode: 'NX00',
                    action: 'UPDATE',
                    entityTable: 'nx00_partner',
                    entityId: row.id,
                    entityCode: row.code,
                    summary: `Update partner ${row.code}`,
                    beforeData: {
                        id: exists.id,
                        code: exists.code,
                        name: exists.name,
                        partnerType: exists.partnerType,
                        contactName: exists.contactName ?? null,
                        phone: exists.phone ?? null,
                        mobile: exists.mobile ?? null,
                        email: exists.email ?? null,
                        address: exists.address ?? null,
                        remark: exists.remark ?? null,
                        isActive: Boolean(exists.isActive),
                    },
                    afterData: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        partnerType: row.partnerType,
                        contactName: row.contactName ?? null,
                        phone: row.phone ?? null,
                        mobile: row.mobile ?? null,
                        email: row.email ?? null,
                        address: row.address ?? null,
                        remark: row.remark ?? null,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: actor.ipAddr ?? null,
                    userAgent: actor.userAgent ?? null,
                });
            }

            return toPartnerDto(row as unknown as PartnerRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('交易夥伴代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, actor?: AuditActor): Promise<PartnerDto> {
        const exists = await this.prisma.nx00Partner.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Partner not found');

        const isActive = Boolean(body.isActive);

        const row = await this.prisma.nx00Partner.update({
            where: { id },
            data: {
                isActive,
                updatedBy: actor?.actorUserId ?? null,
            },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        // AuditLog（SET_ACTIVE）
        if (actor?.actorUserId) {
            await this.audit.write({
                actorUserId: actor.actorUserId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_partner',
                entityId: row.id,
                entityCode: row.code,
                summary: `${isActive ? 'Enable' : 'Disable'} partner ${row.code}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: actor.ipAddr ?? null,
                userAgent: actor.userAgent ?? null,
            });
        }

        return toPartnerDto(row as unknown as PartnerRowWithAudit);
    }
}