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
import type { CreateUserBody, ListUserQuery, PagedResult, SetActiveBody, UpdateUserBody, UserDto } from '../dto/user.dto';

// Prisma error codes (keep minimal, no extra deps)
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type UserRowWithAudit = {
    id: string;
    username: string;
    passwordHash: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toUserDto(row: UserRowWithAudit): UserDto {
    return {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        email: row.email ?? null,
        phone: row.phone ?? null,
        isActive: Boolean(row.isActive),
        lastLoginAt: row.lastLoginAt ? (row.lastLoginAt.toISOString?.() ?? String(row.lastLoginAt)) : null,

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

/**
 * 密碼雜湊（目前用 Node crypto，避免額外依賴）
 * - 這不是最終安全方案（建議之後改 argon2/bcrypt）
 * - 但先讓 LITE 可用，並保留可替換點
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

function hashPasswordLite(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const digest = createHash('sha256').update(`${salt}:${password}`).digest('hex');
    return `sha256$${salt}$${digest}`;
}

function verifyPasswordLite(password: string, stored: string): boolean {
    // 格式：sha256$<salt>$<digest>
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [alg, salt, digest] = parts;
    if (alg !== 'sha256') return false;
    const check = createHash('sha256').update(`${salt}:${password}`).digest('hex');
    return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(check, 'hex'));
}

/**
 * User CRUD Context（用於 AuditLog）
 */
export type UserActionContext = {
    actorUserId?: string;
    ipAddr?: string | null;
    userAgent?: string | null;
};

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditLogService,
    ) { }

    async list(query: ListUserQuery): Promise<PagedResult<UserDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where = q
            ? {
                OR: [
                    { username: { contains: q, mode: 'insensitive' as const } },
                    { displayName: { contains: q, mode: 'insensitive' as const } },
                    { email: { contains: q, mode: 'insensitive' as const } },
                    { phone: { contains: q, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [total, rows] = await Promise.all([
            this.prisma.nx00User.count({ where }),
            this.prisma.nx00User.findMany({
                where,
                orderBy: [{ username: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
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

    async get(id: string): Promise<UserDto> {
        const row = await this.prisma.nx00User.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        if (!row) throw new NotFoundException('User not found');
        return toUserDto(row as unknown as UserRowWithAudit);
    }

    async create(body: CreateUserBody, ctx?: UserActionContext): Promise<UserDto> {
        const username = body.username?.trim();
        const displayName = body.displayName?.trim();
        const password = body.password;

        if (!username) throw new BadRequestException('username is required');
        if (!displayName) throw new BadRequestException('displayName is required');
        if (typeof password !== 'string' || password.length < 6) {
            throw new BadRequestException('password is required (min 6 chars)');
        }

        const passwordHash = hashPasswordLite(password);

        try {
            const row = await this.prisma.nx00User.create({
                data: {
                    // id 交給 DB default：gen_nx00_user_id()
                    username,
                    passwordHash,
                    displayName,
                    email: body.email ?? null,
                    phone: body.phone ?? null,
                    isActive: body.isActive ?? true,
                    createdBy: ctx?.actorUserId ?? null,
                    updatedBy: ctx?.actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            // AuditLog（CREATE）：若沒有 actorUserId（例如系統 seed/批次），就不寫
            if (ctx?.actorUserId) {
                await this.audit.write({
                    actorUserId: ctx.actorUserId,
                    moduleCode: 'NX00',
                    action: 'CREATE',
                    entityTable: 'nx00_user',
                    entityId: row.id,
                    entityCode: row.username,
                    summary: `Create user ${row.username}`,
                    beforeData: null,
                    afterData: {
                        id: row.id,
                        username: row.username,
                        displayName: row.displayName,
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

        if (typeof body.displayName === 'string') data.displayName = body.displayName.trim();
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
                    entityTable: 'nx00_user',
                    entityId: row.id,
                    entityCode: row.username,
                    summary: `Update user ${row.username}`,
                    beforeData: {
                        id: exists.id,
                        username: exists.username,
                        displayName: exists.displayName,
                        email: exists.email ?? null,
                        phone: exists.phone ?? null,
                        isActive: Boolean(exists.isActive),
                        lastLoginAt: exists.lastLoginAt ? (exists.lastLoginAt.toISOString?.() ?? String(exists.lastLoginAt)) : null,
                    },
                    afterData: {
                        id: row.id,
                        username: row.username,
                        displayName: row.displayName,
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
                entityTable: 'nx00_user',
                entityId: row.id,
                entityCode: row.username,
                summary: `Set user ${row.username} active=${Boolean(body.isActive)}`,
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