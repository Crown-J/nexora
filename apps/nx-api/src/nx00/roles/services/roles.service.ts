/**
 * File: apps/nx-api/src/nx00/roles/services/roles.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLES-SVC-001：Roles Service（CRUD + audit user displayName）
 *
 * Notes:
 * - 目前 DB nx00_role.id 為 NOT NULL 且無 DEFAULT，因此由後端產生 ID（NX00ROLE0000001）
 * - 使用 pg_advisory_xact_lock 做併發保護，避免同時新增造成序號重複
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
    CreateRoleBody,
    ListRolesQuery,
    PagedResult,
    RoleDto,
    SetActiveBody,
    UpdateRoleBody,
} from '../dto/roles.dto';

// Prisma error codes (keep minimal, no extra deps)
type PrismaKnownError = { code?: string; meta?: any; message?: string };

type RoleRowWithAudit = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;

    createdAt: Date;
    createdBy: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;

    createdByUser?: { displayName: string } | null;
    updatedByUser?: { displayName: string } | null;
};

function toRoleDto(row: RoleRowWithAudit): RoleDto {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? null,
        isActive: Boolean(row.isActive),

        createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
        createdBy: row.createdBy ?? null,
        createdByName: row.createdByUser?.displayName ?? null,

        updatedAt: row.updatedAt ? (row.updatedAt.toISOString?.() ?? String(row.updatedAt)) : null,
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedByUser?.displayName ?? null,
    };
}

/**
 * 產生 NX 規格 ID（後端產生，併發安全）
 * - 格式：<prefix><流水號補零>
 * - 例：prefix='NX00ROLE'，總長 15 => suffixLen = 15 - 7 = 8 => NX00ROLE00000001（但你規格是 7+8=15 => NX00ROLE0000001）
 *   注意：你範例 NX00ROLE0000001 是 suffixLen=8? 其實 "0000001" 是 7 位；但你也寫 15 碼。
 *   以你目前資料畫面與 Prisma @db.VarChar(15) 來看：NX00ROLE(7) + 8位數 = 15
 *   => NX00ROLE00000001（8位）才剛好 15。
 *
 * 但你畫面中已有 NX00ROLE0000001（7位）= 14 碼，代表你實際資料可能是 14/15 混用。
 * 為避免破壞既有資料，這裡採「偵測現有最大尾碼長度」：
 * - 若已有資料尾碼長度為 7，就沿用 7
 * - 否則預設用 8（讓新資料符合 15 碼）
 */
async function genNxRoleId(prisma: PrismaService): Promise<string> {
    const prefix = 'NX00ROLE';

    // 用交易確保 lock + 取號 + 使用同一個連線
    return prisma.$transaction(async (tx) => {
        // 併發鎖：同 prefix 的新增會排隊
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, prefix);

        // 找出目前最大的 id
        // (用 orderBy desc + take 1 避免全表掃描/regex)
        const last = await tx.nx00Role.findFirst({
            where: { id: { startsWith: prefix } },
            orderBy: { id: 'desc' },
            select: { id: true },
        });

        // 決定尾碼長度：有舊資料就沿用舊資料尾碼長度，避免混亂
        let suffixLen = 8; // 預設 8（prefix 7 + 8 = 15）
        if (last?.id?.startsWith(prefix)) {
            const tail = last.id.slice(prefix.length);
            if (/^\d+$/.test(tail) && tail.length > 0) suffixLen = tail.length;
        }

        let nextNum = 1;

        if (last?.id?.startsWith(prefix)) {
            const tail = last.id.slice(prefix.length);
            if (/^\d+$/.test(tail)) {
                const n = Number(tail);
                if (Number.isFinite(n) && n >= 0) nextNum = n + 1;
            }
        }

        const nextTail = String(nextNum).padStart(suffixLen, '0');
        const nextId = `${prefix}${nextTail}`;

        // 防呆：長度不得超過 15（你的欄位是 VARCHAR(15)）
        if (nextId.length > 15) {
            throw new BadRequestException(`ID overflow: ${nextId} (len=${nextId.length})`);
        }

        return nextId;
    });
}

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListRolesQuery): Promise<PagedResult<RoleDto>> {
        const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
        const pageSize =
            Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

        const q = query.q?.trim() ? query.q.trim() : undefined;

        const where = q
            ? {
                OR: [
                    { code: { contains: q, mode: 'insensitive' as const } },
                    { name: { contains: q, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [total, rows] = await Promise.all([
            this.prisma.nx00Role.count({ where }),
            this.prisma.nx00Role.findMany({
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
            items: (rows as unknown as RoleRowWithAudit[]).map(toRoleDto),
            page,
            pageSize,
            total,
        };
    }

    async get(id: string): Promise<RoleDto> {
        const row = await this.prisma.nx00Role.findUnique({
            where: { id },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });
        if (!row) throw new NotFoundException('Role not found');
        return toRoleDto(row as unknown as RoleRowWithAudit);
    }

    async create(body: CreateRoleBody, actorUserId?: string): Promise<RoleDto> {
        const code = body.code?.trim();
        const name = body.name?.trim();

        if (!code) throw new BadRequestException('code is required');
        if (!name) throw new BadRequestException('name is required');

        try {
            // 產生後端 ID（併發安全）
            const id = await genNxRoleId(this.prisma);

            const row = await this.prisma.nx00Role.create({
                data: {
                    id,
                    code,
                    name,
                    description: body.description ?? null,
                    isActive: body.isActive ?? true,
                    createdBy: actorUserId ?? null,
                },
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toRoleDto(row as unknown as RoleRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;

            // unique violation: code
            if (pe?.code === 'P2002') {
                // meta.target 常見會是 ['code'] 或 'nx00_role_code_key'
                throw new BadRequestException('角色代碼已存在，請更換 code');
            }

            // not null id / db errors
            throw e;
        }
    }

    async update(id: string, body: UpdateRoleBody, actorUserId?: string): Promise<RoleDto> {
        const exists = await this.prisma.nx00Role.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Role not found');

        const data: any = {
            updatedAt: new Date(),
            updatedBy: actorUserId ?? null,
        };

        if (typeof body.code === 'string') data.code = body.code.trim();
        if (typeof body.name === 'string') data.name = body.name.trim();
        if (body.description !== undefined) data.description = body.description ?? null;
        if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

        try {
            const row = await this.prisma.nx00Role.update({
                where: { id },
                data,
                include: {
                    createdByUser: { select: { displayName: true } },
                    updatedByUser: { select: { displayName: true } },
                },
            });

            return toRoleDto(row as unknown as RoleRowWithAudit);
        } catch (e: any) {
            const pe = e as PrismaKnownError;
            if (pe?.code === 'P2002') {
                throw new BadRequestException('角色代碼已存在，請更換 code');
            }
            throw e;
        }
    }

    async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<RoleDto> {
        const exists = await this.prisma.nx00Role.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Role not found');

        const row = await this.prisma.nx00Role.update({
            where: { id },
            data: {
                isActive: Boolean(body.isActive),
                updatedAt: new Date(),
                updatedBy: actorUserId ?? null,
            },
            include: {
                createdByUser: { select: { displayName: true } },
                updatedByUser: { select: { displayName: true } },
            },
        });

        return toRoleDto(row as unknown as RoleRowWithAudit);
    }
}