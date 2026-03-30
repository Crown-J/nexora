import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
  BulletinDto,
  CreateBulletinBody,
  ListBulletinQuery,
  PagedResult,
  SetActiveBody,
  UpdateBulletinBody,
} from '../dto/bulletin.dto';

type Ctx = {
  actorUserId?: string;
  ipAddr?: string | null;
  userAgent?: string | null;
};

function toDto(row: {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  scopeType: string;
  isPinned: boolean;
  expiredAt: Date | null;
  isActive: boolean;
  displayBadge: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  createdByUser?: { displayName: string } | null;
  updatedByUser?: { displayName: string } | null;
}): BulletinDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    subtitle: row.subtitle ?? null,
    content: row.content ?? null,
    scopeType: row.scopeType,
    isPinned: Boolean(row.isPinned),
    expiredAt: row.expiredAt?.toISOString?.() ?? null,
    isActive: Boolean(row.isActive),
    displayBadge: row.displayBadge ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    createdBy: row.createdBy ?? null,
    createdByName: row.createdByUser?.displayName ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    updatedBy: row.updatedBy ?? null,
    updatedByName: row.updatedByUser?.displayName ?? null,
  };
}

@Injectable()
export class BulletinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private requireTenant(tenantId: string | null | undefined): string {
    if (!tenantId) {
      throw new BadRequestException('請先綁定租戶（tenant）後再操作');
    }
    return tenantId;
  }

  async list(
    tenantId: string | null | undefined,
    query: ListBulletinQuery,
  ): Promise<PagedResult<BulletinDto>> {
    if (!tenantId) {
      return { items: [], page: 1, pageSize: 20, total: 0 };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const where: Record<string, unknown> = { tenantId };
    if (typeof query.scopeType === 'string' && query.scopeType.length > 0) {
      where.scopeType = query.scopeType;
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx00Bulletin.count({ where }),
      this.prisma.nx00Bulletin.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdByUser: { select: { displayName: true } },
          updatedByUser: { select: { displayName: true } },
        },
      }),
    ]);

    return {
      items: rows.map(toDto),
      page,
      pageSize,
      total,
    };
  }

  async get(tenantId: string | null | undefined, id: string): Promise<BulletinDto> {
    const tid = tenantId;
    if (!tid) {
      throw new NotFoundException('Bulletin not found');
    }
    const row = await this.prisma.nx00Bulletin.findFirst({
      where: { id, tenantId: tid },
      include: {
        createdByUser: { select: { displayName: true } },
        updatedByUser: { select: { displayName: true } },
      },
    });
    if (!row) throw new NotFoundException('Bulletin not found');
    return toDto(row);
  }

  async create(
    tenantId: string | null | undefined,
    body: CreateBulletinBody,
    ctx?: Ctx,
  ): Promise<BulletinDto> {
    const tid = this.requireTenant(tenantId);
    const title = body.title?.trim();
    if (!title) throw new BadRequestException('title is required');
    const scope = body.scopeType?.trim();
    if (!scope || scope.length !== 1 || !['S', 'C', 'R'].includes(scope)) {
      throw new BadRequestException('scopeType must be S, C, or R');
    }

    const row = await this.prisma.nx00Bulletin.create({
      data: {
        tenantId: tid,
        title,
        subtitle: body.subtitle?.trim() ?? null,
        content: body.content ?? null,
        scopeType: scope,
        isPinned: body.isPinned ?? false,
        expiredAt: body.expiredAt ? new Date(body.expiredAt) : null,
        isActive: body.isActive ?? true,
        displayBadge: body.displayBadge?.trim() ?? null,
        createdBy: ctx?.actorUserId ?? null,
        updatedBy: ctx?.actorUserId ?? null,
      },
      include: {
        createdByUser: { select: { displayName: true } },
        updatedByUser: { select: { displayName: true } },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX00',
        action: 'CREATE',
        entityTable: 'nx00_bulletin',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Create bulletin ${row.title}`,
        beforeData: null,
        afterData: { id: row.id, title: row.title, scopeType: row.scopeType },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toDto(row);
  }

  async update(
    tenantId: string | null | undefined,
    id: string,
    body: UpdateBulletinBody,
    ctx?: Ctx,
  ): Promise<BulletinDto> {
    const tid = this.requireTenant(tenantId);
    const exists = await this.prisma.nx00Bulletin.findFirst({
      where: { id, tenantId: tid },
    });
    if (!exists) throw new NotFoundException('Bulletin not found');

    const data: Record<string, unknown> = {
      updatedBy: ctx?.actorUserId ?? null,
    };
    if (typeof body.title === 'string') data.title = body.title.trim();
    if (body.subtitle !== undefined) data.subtitle = body.subtitle?.trim() ?? null;
    if (body.content !== undefined) data.content = body.content ?? null;
    if (typeof body.scopeType === 'string') {
      const scope = body.scopeType.trim();
      if (scope.length !== 1 || !['S', 'C', 'R'].includes(scope)) {
        throw new BadRequestException('scopeType must be S, C, or R');
      }
      data.scopeType = scope;
    }
    if (typeof body.isPinned === 'boolean') data.isPinned = body.isPinned;
    if (body.expiredAt !== undefined) {
      data.expiredAt = body.expiredAt ? new Date(body.expiredAt) : null;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (body.displayBadge !== undefined) data.displayBadge = body.displayBadge?.trim() ?? null;

    const row = await this.prisma.nx00Bulletin.update({
      where: { id },
      data,
      include: {
        createdByUser: { select: { displayName: true } },
        updatedByUser: { select: { displayName: true } },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX00',
        action: 'UPDATE',
        entityTable: 'nx00_bulletin',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Update bulletin ${row.title}`,
        beforeData: {
          title: exists.title,
          scopeType: exists.scopeType,
          isActive: exists.isActive,
        },
        afterData: {
          title: row.title,
          scopeType: row.scopeType,
          isActive: row.isActive,
        },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toDto(row);
  }

  async setActive(
    tenantId: string | null | undefined,
    id: string,
    body: SetActiveBody,
    ctx?: Ctx,
  ): Promise<BulletinDto> {
    const tid = this.requireTenant(tenantId);
    const exists = await this.prisma.nx00Bulletin.findFirst({
      where: { id, tenantId: tid },
      select: { id: true, title: true, isActive: true },
    });
    if (!exists) throw new NotFoundException('Bulletin not found');

    const row = await this.prisma.nx00Bulletin.update({
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

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX00',
        action: 'SET_ACTIVE',
        entityTable: 'nx00_bulletin',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Set bulletin active=${body.isActive}`,
        beforeData: { isActive: exists.isActive },
        afterData: { isActive: row.isActive },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toDto(row);
  }
}
