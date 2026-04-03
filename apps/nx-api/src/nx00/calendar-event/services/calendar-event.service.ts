import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import type {
  CalendarEventDto,
  CreateCalendarEventBody,
  ListCalendarEventQuery,
  PagedResult,
  SetActiveBody,
  UpdateCalendarEventBody,
} from '../dto/calendar-event.dto';

type Ctx = {
  actorUserId?: string;
  ipAddr?: string | null;
  userAgent?: string | null;
};

function toDto(row: {
  id: string;
  tenantId: string;
  title: string;
  scopeType: string;
  dateStart: Date;
  dateEnd: Date;
  isAllDay: boolean;
  orderType: string | null;
  orderDocNo: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  createdByUser?: { userName: string } | null;
  updatedByUser?: { userName: string } | null;
}): CalendarEventDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    scopeType: row.scopeType,
    dateStart: row.dateStart?.toISOString?.() ?? String(row.dateStart),
    dateEnd: row.dateEnd?.toISOString?.() ?? String(row.dateEnd),
    isAllDay: Boolean(row.isAllDay),
    orderType: row.orderType ?? null,
    orderDocNo: row.orderDocNo ?? null,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    createdBy: row.createdBy ?? null,
    createdByName: row.createdByUser?.userName ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    updatedBy: row.updatedBy ?? null,
    updatedByName: row.updatedByUser?.userName ?? null,
  };
}

function parseDayRange(from?: string, to?: string): { fromStart: Date; toEnd: Date } | null {
  if (!from || !to) return null;
  const fromStart = new Date(`${from}T00:00:00.000Z`);
  const toEnd = new Date(`${to}T23:59:59.999Z`);
  if (Number.isNaN(fromStart.getTime()) || Number.isNaN(toEnd.getTime())) {
    throw new BadRequestException('from / to must be YYYY-MM-DD');
  }
  if (fromStart > toEnd) {
    throw new BadRequestException('from must be <= to');
  }
  return { fromStart, toEnd };
}

@Injectable()
export class CalendarEventService {
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
    query: ListCalendarEventQuery,
  ): Promise<PagedResult<CalendarEventDto>> {
    if (!tenantId) {
      return { items: [], page: 1, pageSize: 50, total: 0 };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;

    const range = parseDayRange(query.from, query.to);

    const where: Record<string, unknown> = { tenantId };
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }
    if (range) {
      where.AND = [
        { dateStart: { lte: range.toEnd } },
        { dateEnd: { gte: range.fromStart } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx00CalendarEvent.count({ where }),
      this.prisma.nx00CalendarEvent.findMany({
        where,
        orderBy: [{ dateStart: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdByUser: { select: { userName: true } },
          updatedByUser: { select: { userName: true } },
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

  async get(tenantId: string | null | undefined, id: string): Promise<CalendarEventDto> {
    if (!tenantId) {
      throw new NotFoundException('Calendar event not found');
    }
    const row = await this.prisma.nx00CalendarEvent.findFirst({
      where: { id, tenantId },
      include: {
        createdByUser: { select: { userName: true } },
        updatedByUser: { select: { userName: true } },
      },
    });
    if (!row) throw new NotFoundException('Calendar event not found');
    return toDto(row);
  }

  async create(
    tenantId: string | null | undefined,
    body: CreateCalendarEventBody,
    ctx?: Ctx,
  ): Promise<CalendarEventDto> {
    const tid = this.requireTenant(tenantId);
    const title = body.title?.trim();
    if (!title) throw new BadRequestException('title is required');
    const scope = body.scopeType?.trim();
    if (!scope || scope.length !== 1 || !['S', 'C', 'R'].includes(scope)) {
      throw new BadRequestException('scopeType must be S, C, or R');
    }
    const dateStart = new Date(body.dateStart);
    const dateEnd = new Date(body.dateEnd);
    if (Number.isNaN(dateStart.getTime()) || Number.isNaN(dateEnd.getTime())) {
      throw new BadRequestException('dateStart / dateEnd invalid');
    }
    if (dateStart > dateEnd) {
      throw new BadRequestException('dateStart must be <= dateEnd');
    }

    const row = await this.prisma.nx00CalendarEvent.create({
      data: {
        tenantId: tid,
        title,
        scopeType: scope,
        dateStart,
        dateEnd,
        isAllDay: body.isAllDay ?? false,
        orderType: body.orderType?.trim() ?? null,
        orderDocNo: body.orderDocNo?.trim() ?? null,
        isActive: body.isActive ?? true,
        createdBy: ctx?.actorUserId ?? null,
        updatedBy: ctx?.actorUserId ?? null,
      },
      include: {
        createdByUser: { select: { userName: true } },
        updatedByUser: { select: { userName: true } },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        tenantId: row.tenantId,
        moduleCode: 'NX00',
        action: 'CREATE',
        entityTable: 'nx00_calendar_event',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Create calendar event ${row.title}`,
        beforeData: null,
        afterData: { id: row.id, title: row.title },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toDto(row);
  }

  async update(
    tenantId: string | null | undefined,
    id: string,
    body: UpdateCalendarEventBody,
    ctx?: Ctx,
  ): Promise<CalendarEventDto> {
    const tid = this.requireTenant(tenantId);
    const exists = await this.prisma.nx00CalendarEvent.findFirst({
      where: { id, tenantId: tid },
    });
    if (!exists) throw new NotFoundException('Calendar event not found');

    const data: Record<string, unknown> = {
      updatedBy: ctx?.actorUserId ?? null,
    };
    if (typeof body.title === 'string') data.title = body.title.trim();
    if (typeof body.scopeType === 'string') {
      const scope = body.scopeType.trim();
      if (scope.length !== 1 || !['S', 'C', 'R'].includes(scope)) {
        throw new BadRequestException('scopeType must be S, C, or R');
      }
      data.scopeType = scope;
    }
    if (body.dateStart !== undefined) data.dateStart = new Date(body.dateStart);
    if (body.dateEnd !== undefined) data.dateEnd = new Date(body.dateEnd);
    if (typeof body.isAllDay === 'boolean') data.isAllDay = body.isAllDay;
    if (body.orderType !== undefined) data.orderType = body.orderType?.trim() ?? null;
    if (body.orderDocNo !== undefined) data.orderDocNo = body.orderDocNo?.trim() ?? null;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const row = await this.prisma.nx00CalendarEvent.update({
      where: { id },
      data,
      include: {
        createdByUser: { select: { userName: true } },
        updatedByUser: { select: { userName: true } },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        tenantId: row.tenantId,
        moduleCode: 'NX00',
        action: 'UPDATE',
        entityTable: 'nx00_calendar_event',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Update calendar event ${row.title}`,
        beforeData: { title: exists.title, isActive: exists.isActive },
        afterData: { title: row.title, isActive: row.isActive },
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
  ): Promise<CalendarEventDto> {
    const tid = this.requireTenant(tenantId);
    const exists = await this.prisma.nx00CalendarEvent.findFirst({
      where: { id, tenantId: tid },
      select: { id: true, title: true, isActive: true },
    });
    if (!exists) throw new NotFoundException('Calendar event not found');

    const row = await this.prisma.nx00CalendarEvent.update({
      where: { id },
      data: {
        isActive: Boolean(body.isActive),
        updatedBy: ctx?.actorUserId ?? null,
      },
      include: {
        createdByUser: { select: { userName: true } },
        updatedByUser: { select: { userName: true } },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        tenantId: row.tenantId,
        moduleCode: 'NX00',
        action: 'SET_ACTIVE',
        entityTable: 'nx00_calendar_event',
        entityId: row.id,
        entityCode: row.title.slice(0, 50),
        summary: `Set calendar event active=${body.isActive}`,
        beforeData: { isActive: exists.isActive },
        afterData: { isActive: row.isActive },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toDto(row);
  }
}
