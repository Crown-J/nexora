import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfUtcIsoWeekMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}

@Injectable()
export class Nx10LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  private window(period: string, now: Date): { curStart: Date; curEnd: Date; prevStart: Date; prevEnd: Date } {
    const p = (period || 'week').toLowerCase();
    if (p === 'all') {
      const curStart = new Date(0);
      const curEnd = new Date(8640000000000000);
      return { curStart, curEnd, prevStart: curStart, prevEnd: curEnd };
    }
    if (p === 'month') {
      const curStart = startOfUtcMonth(now);
      const curEnd = now;
      const prevMonthEnd = new Date(curStart.getTime() - 1);
      const prevStart = startOfUtcMonth(prevMonthEnd);
      const prevEnd = curStart;
      return { curStart, curEnd, prevStart, prevEnd };
    }
    if (p === 'week') {
      const curStart = startOfUtcIsoWeekMonday(now);
      const curEnd = now;
      const prevEnd = new Date(curStart.getTime() - 1);
      const prevStart = startOfUtcIsoWeekMonday(prevEnd);
      return { curStart, curEnd, prevStart, prevEnd };
    }
    throw new BadRequestException('period must be week|month|all');
  }

  async leaderboard(user: RequestUser, periodRaw: string | undefined) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const period = (periodRaw || 'week').toLowerCase();
    const now = new Date();
    const { curStart, curEnd, prevStart, prevEnd } = this.window(period, now);

    const users = await this.prisma.nx01User.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: {
        id: true,
        userName: true,
        departmentId: true,
        hrDepartment: { select: { name: true } },
      },
    });
    const userIds = users.map((u) => u.id);
    if (!userIds.length) return { period, entries: [] };

    if (period === 'all') {
      const medals = await this.prisma.nx10EmpMedal.findMany({
        where: { tenantId: user.tenantId, userId: { in: userIds } },
        select: { userId: true, totalExp: true },
      });
      const xpMap = new Map(medals.map((m) => [m.userId, m.totalExp]));
      const sorted = [...users].sort((a, b) => (xpMap.get(b.id) ?? 0) - (xpMap.get(a.id) ?? 0));
      return {
        period,
        entries: sorted.map((u, i) => ({
          rank: i + 1,
          userId: u.id,
          userName: u.userName,
          departmentName: u.hrDepartment?.name ?? null,
          xp: xpMap.get(u.id) ?? 0,
          rankChange: null as number | null,
        })),
      };
    }

    const sumForRange = async (from: Date, to: Date) => {
      const rows = await this.prisma.nx10EmpExpLog.groupBy({
        by: ['userId'],
        where: {
          tenantId: user.tenantId!,
          userId: { in: userIds },
          createdAt: { gte: from, lte: to },
        },
        _sum: { expChange: true },
      });
      const m = new Map<string, number>();
      for (const r of rows) {
        m.set(r.userId, r._sum.expChange ?? 0);
      }
      return m;
    };

    const curMap = await sumForRange(curStart, curEnd);
    const prevMap = await sumForRange(prevStart, prevEnd);

    const rankOf = (m: Map<string, number>) => {
      const arr = [...userIds].sort((a, b) => (m.get(b) ?? 0) - (m.get(a) ?? 0));
      const ranks = new Map<string, number>();
      arr.forEach((id, i) => ranks.set(id, i + 1));
      return ranks;
    };

    const prevRanks = rankOf(prevMap);
    const sortedIds = [...userIds].sort((a, b) => (curMap.get(b) ?? 0) - (curMap.get(a) ?? 0));

    return {
      period,
      entries: sortedIds.map((id, i) => {
        const u = users.find((x) => x.id === id)!;
        const pr = prevRanks.get(id);
        const rankChange = pr === undefined ? null : pr - (i + 1);
        return {
          rank: i + 1,
          userId: id,
          userName: u.userName,
          departmentName: u.hrDepartment?.name ?? null,
          xp: curMap.get(id) ?? 0,
          rankChange,
        };
      }),
    };
  }
}
