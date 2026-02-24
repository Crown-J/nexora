/**
 * File: apps/nx-api/src/users/users.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USERS-SVC-001：Users CRUD service（safe output + audit user displayName）
 *
 * Notes:
 * - nx00_user.id 為 VARCHAR(15) NOT NULL：若 DB 沒有 DEFAULT/trigger，需由後端產生
 * - 產生方式採 pg_advisory_xact_lock + transaction，避免併發重複 ID
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';

import type {
  ChangePasswordBody,
  CreateUserBody,
  ListUsersQuery,
  ListUsersResponse,
  SetActiveBody,
  UpdateUserBody,
  UserSafeDto,
} from '../dto/users.dto';

function getPrismaCode(err: unknown): string | null {
  if (typeof err !== 'object' || !err) return null;
  const anyErr = err as any;
  return typeof anyErr.code === 'string' ? anyErr.code : null;
}

type UserRowWithAudit = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  statusCode: string;
  lastLoginAt: Date | null;

  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;

  createdByUser?: { displayName: string } | null;
  updatedByUser?: { displayName: string } | null;
};

function toSafeDto(row: UserRowWithAudit): UserSafeDto {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isActive: !!row.isActive,
    statusCode: row.statusCode ?? 'A',
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? null,
    createdByName: row.createdByUser?.displayName ?? null,

    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    updatedBy: row.updatedBy ?? null,
    updatedByName: row.updatedByUser?.displayName ?? null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @CODE nxapi_nx00_users_gen_id_002
   * 說明：後端產生 ID（併發安全）
   * - prefix: NX00USER
   * - 尾碼長度：若已有資料則沿用既有尾碼長度（避免 7/8 混用），否則預設 8（7+8=15）
   */
  private async genUserIdTx(tx: any): Promise<string> {
    const prefix = 'NX00USER';

    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, prefix);

    const last = await tx.nx00User.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    let suffixLen = 8;
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

    if (nextId.length > 15) {
      throw new BadRequestException(`ID overflow: ${nextId} (len=${nextId.length})`);
    }

    return nextId;
  }

  /**
   * @CODE nxapi_nx00_users_list_002
   * GET /users
   * - 回傳 audit name（createdByName/updatedByName）
   */
  async list(query: ListUsersQuery): Promise<ListUsersResponse> {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
    const skip = (page - 1) * pageSize;

    const q = (query.q ?? '').trim();
    const where: any = {};

    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;
    if (query.statusCode && query.statusCode.trim()) where.statusCode = query.statusCode.trim();

    const [total, rows] = await Promise.all([
      this.prisma.nx00User.count({ where }),
      this.prisma.nx00User.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          createdByUser: { select: { displayName: true } },
          updatedByUser: { select: { displayName: true } },
        },
      }),
    ]);

    return {
      items: (rows as unknown as UserRowWithAudit[]).map(toSafeDto),
      page,
      pageSize,
      total,
    };
  }

  /**
   * @CODE nxapi_nx00_users_get_002
   * GET /users/:id
   * - 回傳 audit name（createdByName/updatedByName）
   */
  async get(id: string): Promise<UserSafeDto> {
    const row = await this.prisma.nx00User.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { displayName: true } },
        updatedByUser: { select: { displayName: true } },
      },
    });

    if (!row) throw new NotFoundException('User not found');
    return toSafeDto(row as unknown as UserRowWithAudit);
  }

  /**
   * @CODE nxapi_nx00_users_create_003
   * POST /users
   * - password: 若未提供或空字串 → default changeme
   * - 回傳 audit name（createdByName/updatedByName）
   */
  async create(body: CreateUserBody, actorUserId?: string): Promise<UserSafeDto> {
    const username = (body.username ?? '').trim();
    const displayName = (body.displayName ?? '').trim();

    if (!username) throw new BadRequestException('username required');
    if (!displayName) throw new BadRequestException('displayName required');

    const pwd = typeof body.password === 'string' ? body.password.trim() : '';
    const rawPassword = pwd ? pwd : 'changeme';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const id = await this.genUserIdTx(tx);

        return tx.nx00User.create({
          data: {
            id,
            username,
            displayName,
            passwordHash,
            email: body.email ?? null,
            phone: body.phone ?? null,
            isActive: body.isActive ?? true,
            statusCode: (body.statusCode ?? 'A').trim() || 'A',
            remark: (body as any).remark ?? null,
            createdBy: actorUserId ?? null,
          },
          include: {
            createdByUser: { select: { displayName: true } },
            updatedByUser: { select: { displayName: true } },
          },
        });
      });

      return toSafeDto(row as unknown as UserRowWithAudit);
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2002') throw new BadRequestException('username already exists');
      throw err;
    }
  }

  /**
   * @CODE nxapi_nx00_users_update_002
   * PUT /users/:id
   * - 回傳 audit name（createdByName/updatedByName）
   */
  async update(id: string, body: UpdateUserBody, actorUserId?: string): Promise<UserSafeDto> {
    const patch: any = {
      updatedAt: new Date(),
      updatedBy: actorUserId ?? null,
    };

    if (typeof body.displayName === 'string') {
      const v = body.displayName.trim();
      if (!v) throw new BadRequestException('displayName cannot be empty');
      patch.displayName = v;
    }

    if ('email' in body) patch.email = body.email ?? null;
    if ('phone' in body) patch.phone = body.phone ?? null;
    if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
    if (typeof body.statusCode === 'string') patch.statusCode = body.statusCode.trim() || 'A';
    if ('remark' in body) patch.remark = (body as any).remark ?? null;

    if (typeof body.password === 'string' && body.password.trim().length > 0) {
      patch.passwordHash = await bcrypt.hash(body.password.trim(), 10);
    }

    try {
      const row = await this.prisma.nx00User.update({
        where: { id },
        data: patch,
        include: {
          createdByUser: { select: { displayName: true } },
          updatedByUser: { select: { displayName: true } },
        },
      });

      return toSafeDto(row as unknown as UserRowWithAudit);
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2025') throw new NotFoundException('User not found');
      if (code === 'P2002') throw new BadRequestException('username already exists');
      throw err;
    }
  }

  /**
   * @CODE nxapi_nx00_users_set_active_001
   * PATCH /users/:id/active
   */
  async setActive(id: string, body: SetActiveBody, actorUserId?: string): Promise<UserSafeDto> {
    if (typeof body?.isActive !== 'boolean') {
      throw new BadRequestException('isActive must be boolean');
    }
    return this.update(id, { isActive: body.isActive } as any, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_change_password_001
   * PATCH /users/:id/password
   */
  async changePassword(id: string, body: ChangePasswordBody, actorUserId?: string) {
    const pwd = (body?.password ?? '').toString().trim();
    if (!pwd) throw new BadRequestException('password required');

    const passwordHash = await bcrypt.hash(pwd, 10);

    try {
      await this.prisma.nx00User.update({
        where: { id },
        data: {
          passwordHash,
          updatedAt: new Date(),
          updatedBy: actorUserId ?? null,
        },
        select: { id: true },
      });

      return { ok: true };
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2025') throw new NotFoundException('User not found');
      throw err;
    }
  }
}