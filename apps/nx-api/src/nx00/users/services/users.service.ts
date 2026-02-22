/**
 * File: apps/nx-api/src/users/users.service.ts
 * Purpose: NX00-API-001 Users CRUD service (safe DTO + create/update/active/password)
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

function toSafeDto(row: any): UserSafeDto {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isActive: !!row.isActive,
    statusCode: row.statusCode ?? 'A',
    lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @CODE nxapi_nx00_users_gen_id_001
   * 說明：先用後端產生 ID（NX00USER + 7碼流水號）
   * - 之後你若改 DB trigger，再替換此函式即可
   */
  private async genUserId(): Promise<string> {
    const last = await this.prisma.nx00User.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const prefix = 'NX00USER';
    const lastSeq =
      last?.id?.startsWith(prefix) ? Number(last.id.slice(prefix.length)) : 0;
    const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;

    return `${prefix}${String(nextSeq).padStart(7, '0')}`;
  }

  /**
   * @CODE nxapi_nx00_users_list_001
   * GET /users
   * - q: 搜尋 username/displayName
   * - page/pageSize: 分頁
   * - isActive/statusCode: 篩選
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
    if (query.statusCode && query.statusCode.trim()) {
      where.statusCode = query.statusCode.trim();
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx00User.count({ where }),
      this.prisma.nx00User.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        // ✅ 永遠不回 passwordHash
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          isActive: true,
          statusCode: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { items: rows.map(toSafeDto), page, pageSize, total };
  }

  /**
   * @CODE nxapi_nx00_users_get_001
   * GET /users/:id
   */
  async get(id: string): Promise<UserSafeDto> {
    const row = await this.prisma.nx00User.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        isActive: true,
        statusCode: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) throw new NotFoundException('User not found');
    return toSafeDto(row);
  }

  /**
   * @CODE nxapi_nx00_users_create_001
   * POST /users
   * - password default changeme
   * - bcrypt hash
   */
  async create(body: CreateUserBody, actorUserId?: string): Promise<UserSafeDto> {
    const username = (body.username ?? '').trim();
    const displayName = (body.displayName ?? '').trim();
    const rawPassword = (body.password ?? 'changeme').toString();

    if (!username) throw new BadRequestException('username required');
    if (!displayName) throw new BadRequestException('displayName required');
    if (!rawPassword) throw new BadRequestException('password required');

    const id = await this.genUserId();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    try {
      const row = await this.prisma.nx00User.create({
        data: {
          id,
          username,
          displayName,
          passwordHash,
          email: body.email ?? null,
          phone: body.phone ?? null,
          isActive: body.isActive ?? true,
          statusCode: (body.statusCode ?? 'A').trim() || 'A',
          createdBy: actorUserId ?? null,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          isActive: true,
          statusCode: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return toSafeDto(row);
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2002') throw new BadRequestException('username already exists');
      throw err;
    }
  }

  /**
   * @CODE nxapi_nx00_users_update_001
   * PUT /users/:id
   * - partial update
   * - 若 body.password 有填才更新 passwordHash（可改用 /password 專用）
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

    if (typeof body.password === 'string' && body.password.length > 0) {
      patch.passwordHash = await bcrypt.hash(body.password, 10);
    }

    try {
      const row = await this.prisma.nx00User.update({
        where: { id },
        data: patch,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          isActive: true,
          statusCode: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return toSafeDto(row);
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2025') throw new NotFoundException('User not found');
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
    return this.update(id, { isActive: body.isActive }, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_change_password_001
   * PATCH /users/:id/password
   * - 專用改密碼 endpoint（建議 UI 用這個）
   */
  async changePassword(id: string, body: ChangePasswordBody, actorUserId?: string) {
    const pwd = (body?.password ?? '').toString();
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

      // 不回 user，避免 UI 誤拿到敏感資訊
      return { ok: true };
    } catch (err) {
      const code = getPrismaCode(err);
      if (code === 'P2025') throw new NotFoundException('User not found');
      throw err;
    }
  }
}
