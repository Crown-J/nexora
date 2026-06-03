// apps/nx-api/src/nx01/calendar-event/calendar-event.service.ts
// 行事曆事件 read-only service — Nx01CalendarEvent table 已存在、本軌僅 list

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

type ListQuery = { from?: string; to?: string };

@Injectable()
export class CalendarEventService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列當前 tenant 啟用中事件、可帶 from / to 日期區間 */
  async list(user: RequestUser, q: ListQuery) {
    const tenantId = requireTenantId(user);

    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (q.from || q.to) {
      const range: Record<string, Date> = {};
      if (q.from) range.gte = new Date(q.from);
      if (q.to) range.lte = new Date(q.to);
      where.dateStart = range;
    }

    const rows = await this.prisma.nx01CalendarEvent.findMany({
      where,
      orderBy: { dateStart: 'asc' },
      select: {
        id: true,
        title: true,
        type: true,
        dateStart: true,
        dateEnd: true,
        isAllDay: true,
        orderType: true,
        orderDocNo: true,
      },
      take: 200,
    });

    return { total: rows.length, rows };
  }
}
