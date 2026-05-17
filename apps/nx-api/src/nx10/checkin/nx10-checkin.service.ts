import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { formatYmdInTimeZone, ymdDaysAgoFromNow } from '../nx10-timezone.util';
import { Nx10ExpService } from '../exp/nx10-exp.service';

@Injectable()
export class Nx10CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exp: Nx10ExpService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private async tenantTz(tenantId: string) {
    const t = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { timezone: true },
    });
    return (t?.timezone || 'Asia/Taipei').trim() || 'Asia/Taipei';
  }

  private ymdFromDbDate(d: Date, tz: string): string {
    return formatYmdInTimeZone(d, tz);
  }

  async getToday(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const tz = await this.tenantTz(user.tenantId);
    const todayYmd = formatYmdInTimeZone(new Date(), tz);
    const log = await this.prisma.nx10CheckinLog.findUnique({
      where: {
        tenantId_userId_checkinDate: {
          tenantId: user.tenantId,
          userId: user.sub,
          checkinDate: new Date(`${todayYmd}T12:00:00.000Z`),
        },
      },
    });
    const medal = await this.prisma.nx10EmpMedal.findUnique({ where: { userId: user.sub } });
    return {
      date: todayYmd,
      checkedIn: !!log,
      consecutiveCheckin: medal?.consecutiveCheckin ?? 0,
      lastCheckinDate: medal?.lastCheckinDate ?? null,
      todayExpEarned: log?.expEarned ?? 0,
    };
  }

  async checkin(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const tz = await this.tenantTz(user.tenantId);
    const todayYmd = formatYmdInTimeZone(new Date(), tz);
    const yesterdayYmd = ymdDaysAgoFromNow(1, tz);
    const checkinDate = new Date(`${todayYmd}T12:00:00.000Z`);

    const out = await this.prisma.$transaction(async (tx) => {
      const dup = await tx.nx10CheckinLog.findUnique({
        where: {
          tenantId_userId_checkinDate: {
            tenantId: user.tenantId!,
            userId: user.sub,
            checkinDate,
          },
        },
      });
      if (dup) throw new ConflictException('Already checked in today');

      const medalRow = await this.exp.ensureEmpMedal(tx, user.tenantId!, user.sub);
      const lastYmd = medalRow.lastCheckinDate ? this.ymdFromDbDate(medalRow.lastCheckinDate, tz) : null;
      if (lastYmd === todayYmd) throw new ConflictException('Already checked in today');

      let newStreak = 1;
      if (lastYmd === yesterdayYmd) newStreak = medalRow.consecutiveCheckin + 1;
      else if (lastYmd) newStreak = 1;

      const streakKey = Math.min(newStreak, 7);
      // A029 撈回（IMPL-01 Phase 4）：STREAK_D{N} 任務範本走系統 tenant 持有（schema @@unique([code]) 是 global、自然全 tenant 共享）
      // 移除 tenantId filter（既有 code 'STREAK_D1'~'STREAK_D7' M2 seed 落在 NX99TANT0000000、不在 user.tenantId）
      const tpl = await tx.nx10TaskTemplate.findFirst({
        where: { code: `STREAK_D${streakKey}`, isActive: true },
      });
      if (!tpl) throw new NotFoundException(`Missing task_template STREAK_D${streakKey}`);
      const expEarned = tpl.expBase;

      const expOut = await this.exp.applyExpChange(tx, {
        tenantId: user.tenantId!,
        userId: user.sub,
        amount: expEarned,
        sourceType: 'CK',
        reason: `簽到連續第${newStreak}日 (+${expEarned})`,
        sourceRefId: tpl.id,
        actorUserId: user.sub,
      });

      await tx.nx10EmpMedal.update({
        where: { userId: user.sub },
        data: {
          lastCheckinDate: checkinDate,
          consecutiveCheckin: newStreak,
        },
      });

      const log = await tx.nx10CheckinLog.create({
        data: {
          tenantId: user.tenantId!,
          userId: user.sub,
          checkinDate,
          consecutiveAfter: newStreak,
          expEarned,
          createdBy: user.sub,
        },
      });

      return { log, expOut, newStreak, expEarned };
    });

    await this.audit.write({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX10',
      action: 'CHECKIN',
      entityTable: 'nx10_checkin_log',
      entityId: out.log.id,
      summary: `Check-in streak ${out.newStreak}, +${out.expEarned} EXP`,
      afterData: { streak: out.newStreak, totalExp: out.expOut.totalExp },
    });

    return {
      checkinLogId: out.log.id,
      consecutiveCheckin: out.newStreak,
      expEarned: out.expEarned,
      exp: out.expOut,
    };
  }
}
