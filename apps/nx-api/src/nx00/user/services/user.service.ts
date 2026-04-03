/**
 * File: apps/nx-api/src/nx00/user/services/user.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-SVC-001：User Service（CRUD + password hash + audit user displayName）
 *
 * Notes:
 * - id 由 DB function 自動產生：gen_nx00_user_id()
 * - passwordHash 存 DB，API 只收 password（明碼）
 * - 為寫入 AuditLog（CREATE/UPDATE/SET_ACTIVE），Controller 會傳入 ctx（actorUserId/ipAddr/userAgent）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
    CreateUserBody,
    ListUserQuery,
    PagedResult,
    SetActiveBody,
    UpdateUserBody,
    UserDto,
    UserReadScope,
} from '../dto/user.dto';

// Prisma error codes (keep minimal, no extra deps)
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type UserRowWithAudit = {
    id: string;
    tenantId: string;
    userAccount: string;
    passwordHash: string;
    userName: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { userAccount: string; userName: string } | null;
    updatedByUser?: { userAccount: string; userName: string } | null;

    userWarehouses?: Array<{ warehouse: { code: string; name: string } | null }>;

    userRoles?: Array<{
        isPrimary: boolean;
        isActive: boolean;
        role: { name: string; code: string } | null;
    }>;
};

function warehouseSummaryFromUserWarehouses(
    rows: UserRowWithAudit['userWarehouses'],
): string | null {
    if (!rows?.length) return null;
    const sorted = [...rows].sort((a, b) => {
        const ca = (a.warehouse?.code ?? '').toLowerCase();
        const cb = (b.warehouse?.code ?? '').toLowerCase();
        return ca.localeCompare(cb, 'zh-Hant', { numeric: true, sensitivity: 'base' });
    });
    const parts: string[] = [];
    for (const r of sorted) {
        const w = r.warehouse;
        if (!w) continue;
        const c = (w.code ?? '').trim();
        const n = (w.name ?? '').trim();
        if (c && n) parts.push(`${c} ${n}`);
        else if (c || n) parts.push(c || n);
    }
    return parts.length ? parts.join('、') : null;
}

function jobTitleFromUserRoles(
    userRoles: UserRowWithAudit['userRoles'],
): string | null {
    const active = (userRoles ?? []).filter((ur) => ur.isActive);
    if (active.length === 0) return null;
    const primary = active.find((ur) => ur.isPrimary) ?? active[0];
    return primary?.role?.name ?? null;
}

function toUserDto(row: UserRowWithAudit): UserDto {
    return {
        id: row.id,
        username: row.userAccount,
        displayName: row.userName,
        email: row.email ?? null,
        phone: row.phone ?? null,
        isActive: Boolean(row.isActive),
        lastLoginAt: row.lastLoginAt ? (row.lastLoginAt.toISOString?.() ?? String(row.lastLoginAt)) : null,
        jobTitle: jobTitleFromUserRoles(row.userRoles),

        warehouseSummary: warehouseSummaryFromUserWarehouses(row.userWarehouses),

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

/**
 * 密碼雜湊（目前用 Node crypto，避免額外依賴）
 * - 這不是最終安全方案（建議之後改 argon2/bcrypt）
 * - 但先讓 LITE 可用，並保留可替換點
 */
import bcrypt from 'bcryptjs';

function hashPasswordLite(password: string): string {
    // 目前先用 bcrypt，預設 cost=10
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

function verifyPasswordLite(password: string, stored: string): boolean {
    return bcrypt.compareSync(password, stored);
}

/**
 * User CRUD Context（用於 AuditLog）
 */
export type UserActionContext = {
    actorUserId?: string;
    tenantId?: string | null;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListUserQuery, scope?: UserReadScope): Promise<PagedResult<UserDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const searchWhere = q
            ? {
                OR: [
                    { userAccount: { contains: q, mode: 'insensitive' as const } },
                    { userName: { contains: q, mode: 'insensitive' as const } },
                    { email: { contains: q, mode: 'insensitive' as const } },
                    { phone: { contains: q, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        /** 租戶內不列出內建帳號 admin（無需指派職務、避免多租戶混淆） */
        const omitBuiltInAdmin =
            tid !== null
                ? { NOT: { userAccount: { equals: 'admin', mode: 'insensitive' as const } } }
                : {};

        const where =
            tid !== null ? { AND: [{ tenantId: tid }, searchWhere, omitBuiltInAdmin] } : searchWhere;

        const [total, rows] = await Promise.all([
            this.prisma.nx00User.count({ where }),
            this.prisma.nx00User.findMany({
                where,
                orderBy: [{ userAccount: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { userAccount: true, userName: true } },
                    updatedByUser: { select: { userAccount: true, userName: true } },
                    userWarehouses: {
                        where: { isActive: true },
                        select: { warehouse: { select: { code: true, name: true } } },
                    },
                    userRoles: {
                        where: { isActive: true },
                        include: { role: { select: { name: true, code: true } } },
                    },
                },
            }),
        ]);

        return {
            items: (rows as unknown as UserRowWithAudit[]).map(toUserDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string, scope?: UserReadScope): Promise<UserDto> {
        const row = await this.prisma.nx00User.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { userAccount: true, userName: true } },
                updatedByUser: { select: { userAccount: true, userName: true } },
                userWarehouses: {
                    where: { isActive: true },
                    select: { warehouse: { select: { code: true, name: true } } },
                },
                userRoles: {
                    where: { isActive: true },
                    include: { role: { select: { name: true, code: true } } },
                },
            },
        });

        if (!row) throw new NotFoundException('User not found');
        const tid = scope?.tenantScopeId?.trim() ? scope.tenantScopeId.trim() : null;
        if (tid !== null && row.tenantId !== tid) throw new NotFoundException('User not found');
        if (tid !== null && row.userAccount.trim().toLowerCase() === 'admin') {
            throw new NotFoundException('User not found');
        }
        return toUserDto(row as unknown as UserRowWithAudit);
    }

    async create(body: CreateUserBody, ctx?: UserActionContext): Promise<UserDto> {
        const username = body.username?.trim();
        const displayName = body.displayName?.trim();
        const password = body.password;

        if (!username) throw new BadRequestException('username is required');
        if (!displayName) throw new BadRequestException('displayName is required');

        const tid =
            (typeof body.tenantId === 'string' && body.tenantId.trim() !== ''
                ? body.tenantId.trim()
                : null) ?? ctx?.tenantId ?? null;
        if (!tid) {
            throw new BadRequestException('tenantId is required (pass in body or use a JWT with tenantId)');
        }
        const tenantOk = await this.prisma.nx99Tenant.findUnique({ where: { id: tid }, select: { id: true } });
        if (!tenantOk) throw new BadRequestException('Tenant not found');

        const effectivePassword =
            typeof password === 'string' && password.length >= 6 ? password : 'changeme';
        const passwordHash = hashPasswordLite(effectivePassword);

        try {
            const row = await this.prisma.nx00User.create({
                data: {
                    // id 交給 DB default：gen_nx00_user_id()
                    tenantId: tid,
                    userAccount: username,
                    passwordHash,
                    userName: displayName,
                    email: body.email ?? null,
                    phone: body.phone ?? null,
                    isActive: body.isActive ?? true,
                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { userAccount: true, userName: true } },
                    updatedByUser: { select: { userAccount: true, userName: true } },
                    userWarehouses: {
                        where: { isActive: true },
                        select: { warehouse: { select: { code: true, name: true } } },
                    },
                    userRoles: {
                        where: { isActive: true },
                        include: { role: { select: { name: true, code: true } } },
                    },
                },
            });

            // AuditLog（CREATE）：若沒有 actorUserId（例如系統 seed/批次），就不寫
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    tenantId: row.tenantId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_user',
                    entityId: row.id,
                    entityCode: row.userAccount,
                    summary: `Create user ${row.userAccount}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        username: row.userAccount,
                        displayName: row.userName,
                        email: row.email ?? null,
                        phone: row.phone ?? null,
                        isActive: Boolean(row.isActive),
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toUserDto(row as unknown as UserRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('帳號已存在，請更換 username');
            }
            throw e;
        }
    }

    async update(id: string, body: UpdateUserBody, ctx?: UserActionContext): Promise<UserDto> {
        const exists = await this.prisma.nx00User.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('User not found');

        const data: any = {
            updatedBy: ctx?.actorUserId ?? null,
        };

        if (typeof body.displayName === 'string') data.userName = body.displayName.trim();
        if (body.email !== undefined) data.email = body.email ?? null;
        if (body.phone !== undefined) data.phone = body.phone ?? null;
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        if (typeof body.password === 'string') {
            if (body.password.length < 6) throw new BadRequestException('password min 6 chars');
            data.passwordHash = hashPasswordLite(body.password);
        }

        try {
            const row = await this.prisma.nx00User.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { userAccount: true, userName: true } },
                    updatedByUser: { select: { userAccount: true, userName: true } },
                    userWarehouses: {
                        where: { isActive: true },
                        select: { warehouse: { select: { code: true, name: true } } },
                    },
                    userRoles: {
                        where: { isActive: true },
                        include: { role: { select: { name: true, code: true } } },
                    },
                },
            });

            // AuditLog（UPDATE）
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    tenantId: row.tenantId,
                    moduleCode: 'NX00',
                    action: 'UPDATE',
                    entityTable: 'nx00_user',
                    entityId: row.id,
                    entityCode: row.userAccount,
                    summary: `Update user ${row.userAccount}`,
                    beforeData: {
                        id: exists.id,
                        username: exists.userAccount,
                        displayName: exists.userName,
                        email: exists.email ?? null,
                        phone: exists.phone ?? null,
                        isActive: Boolean(exists.isActive),
                        lastLoginAt: exists.lastLoginAt ? (exists.lastLoginAt.toISOString?.() ?? String(exists.lastLoginAt)) : null,
                    },
                    afterData: {
                        id: row.id,
                        username: row.userAccount,
                        displayName: row.userName,
                        email: row.email ?? null,
                        phone: row.phone ?? null,
                        isActive: Boolean(row.isActive),
                        lastLoginAt: row.lastLoginAt ? (row.lastLoginAt.toISOString?.() ?? String(row.lastLoginAt)) : null,
                    },
                    ipAddr: ctx.ipAddr ?? null,
                    userAgent: ctx.userAgent ?? null,
                });
            }

            return toUserDto(row as unknown as UserRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('欄位唯一性衝突（可能是 username/email）');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, ctx?: UserActionContext): Promise<UserDto> {
        const exists = await this.prisma.nx00User.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('User not found');

        const row = await this.prisma.nx00User.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedBy: ctx?.actorUserId ?? null,
            },
            include: {
                createdByUser: { select: { userAccount: true, userName: true } },
                updatedByUser: { select: { userAccount: true, userName: true } },
                userWarehouses: {
                    where: { isActive: true },
                    select: { warehouse: { select: { code: true, name: true } } },
                },
                userRoles: {
                    where: { isActive: true },
                    include: { role: { select: { name: true, code: true } } },
                },
            },
        });

        // AuditLog（SET_ACTIVE）
        if (ctx?.actorUserId) {
            await this.audit.write({
                actorUserId: ctx.actorUserId,
                tenantId: row.tenantId,
                moduleCode: 'NX00',
                action: 'SET_ACTIVE',
                entityTable: 'nx00_user',
                entityId: row.id,
                entityCode: row.userAccount,
                summary: `Set user ${row.userAccount} active=${Boolean(body.isActive)}`,
                beforeData: { isActive: Boolean(exists.isActive) },
                afterData: { isActive: Boolean(row.isActive) },
                ipAddr: ctx.ipAddr ?? null,
                userAgent: ctx.userAgent ?? null,
            });
        }

        return toUserDto(row as unknown as UserRowWithAudit);
    }

    // （可選）之後 auth/me 或 login 會用到：驗證密碼
    async verifyPassword(userId: string, password: string): Promise<boolean> {
        const row = await this.prisma.nx00User.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (!row) return false;
        return verifyPasswordLite(password, row.passwordHash);
    }
}