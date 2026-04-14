import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { planSupportsNexoraPro } from '../../shared/nexora-pro-plan';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { formatYmdInTimeZone } from '../nx10-timezone.util';
import { Nx10ExpService } from '../exp/nx10-exp.service';

import { Nx10TaskListQueryDto } from './dto/nx10-task-list-query.dto';

@Injectable()
export class Nx10TasksService {
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

  private parseYmdEndUtc(ymd: string): Date {
    return new Date(`${ymd}T23:59:59.999Z`);
  }

  async today(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const tz = await this.tenantTz(user.tenantId);
    const todayYmd = formatYmdInTimeZone(new Date(), tz);
    const tenantId = user.tenantId;
    const isPro = planSupportsNexoraPro(user.planCode);

    const [
      rfqPending,
      rrInspect,
      pkTodo,
      plTodo,
      soShip,
      quoteReply,
      apDue,
      arOverdue,
    ] = await Promise.all([
      this.prisma.nx02Rfq.count({
        where: { tenantId, status: { in: ['DRAFT', 'SENT'] } },
      }),
      this.prisma.nx02Rr.count({
        where: { tenantId, status: 'INSPECTING' },
      }),
      this.prisma.nx03Pk.count({
        where: { tenantId, status: { in: ['P', 'C'] } },
      }),
      this.prisma.nx03Pl.count({
        where: { tenantId, status: { in: ['P', 'C'] } },
      }),
      this.prisma.nx04So.count({
        where: { tenantId, status: { in: ['CONFIRMED', 'PICKING'] } },
      }),
      this.prisma.nx04Quote.count({
        where: { tenantId, status: 'SENT' },
      }),
      this.prisma.nx05ApLedger.count({
        where: {
          tenantId,
          status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
          dueDate: { lte: this.parseYmdEndUtc(todayYmd) },
        },
      }),
      this.prisma.nx05ArLedger.count({
        where: {
          tenantId,
          OR: [
            { status: 'OVERDUE' },
            { overdueDays: { gt: 0 }, status: { in: ['OPEN', 'PARTIAL'] } },
          ],
        },
      }),
    ]);

    const moduleTasks = [
      { id: 'NX02_RFQ', sourceModule: 'NX02', title: '待處理詢價單', count: rfqPending },
      { id: 'NX02_RR', sourceModule: 'NX02', title: '待驗收進貨單', count: rrInspect },
      { id: 'NX03_PK', sourceModule: 'NX03', title: '待撿貨', count: pkTodo },
      { id: 'NX03_PL', sourceModule: 'NX03', title: '待包貨', count: plTodo },
      { id: 'NX04_SO', sourceModule: 'NX04', title: '待出貨銷貨單', count: soShip },
      { id: 'NX04_QT', sourceModule: 'NX04', title: '待回覆報價', count: quoteReply },
      { id: 'NX05_AP', sourceModule: 'NX05', title: '到期 AP', count: apDue },
      { id: 'NX05_AR', sourceModule: 'NX05', title: '逾期 AR', count: arOverdue },
    ];

    let gameTasks: {
      id: string;
      sourceModule: string;
      title: string;
      periodValue: string;
      expBase: number;
    }[] = [];

    if (isPro) {
      const rows = await this.prisma.nx10EmpTaskLog.findMany({
        where: { tenantId, userId: user.sub, isCompleted: false },
        include: { taskTemplate: true },
        take: 100,
        orderBy: { calculatedAt: 'desc' },
      });
      gameTasks = rows
        .filter((r) => !r.taskTemplate.code.startsWith('STREAK_'))
        .map((r) => ({
          id: r.id,
          sourceModule: 'NX10',
          title: r.taskTemplate.name,
          periodValue: r.periodValue,
          expBase: r.taskTemplate.expBase,
        }));
    }

    return {
      planCode: user.planCode,
      date: todayYmd,
      moduleTasks,
      gameTasks,
    };
  }

  async list(user: RequestUser, q: Nx10TaskListQueryDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const where: {
      tenantId: string;
      userId: string;
      isCompleted?: boolean;
    } = { tenantId: user.tenantId, userId: user.sub };
    if (q.isCompleted !== undefined) where.isCompleted = q.isCompleted;
    return this.prisma.nx10EmpTaskLog.findMany({
      where,
      include: {
        taskTemplate: {
          select: { id: true, code: true, name: true, expBase: true, taskCycle: true, sourceModule: true },
        },
      },
      orderBy: { calculatedAt: 'desc' },
      take: 200,
    });
  }

  async markDone(user: RequestUser, id: string) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const row = await this.prisma.nx10EmpTaskLog.findFirst({
      where: { id, tenantId: user.tenantId, userId: user.sub },
      include: { taskTemplate: true },
    });
    if (!row) throw new NotFoundException('Task log not found');
    if (row.isCompleted) throw new BadRequestException('Already completed');

    const amount = row.taskTemplate.expBase;
    if (!amount || amount < 1) throw new BadRequestException('Task has no EXP reward');

    const out = await this.prisma.$transaction(async (tx) => {
      const expOut = await this.exp.applyExpChange(tx, {
        tenantId: user.tenantId!,
        userId: user.sub,
        amount,
        sourceType: 'KP',
        reason: `任務完成：${row.taskTemplate.name} (+${amount})`,
        sourceRefId: row.id,
        actorUserId: user.sub,
      });
      await tx.nx10EmpTaskLog.update({
        where: { id: row.id },
        data: { isCompleted: true, expEarned: amount },
      });
      return expOut;
    });

    await this.audit.write({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX10',
      action: 'TASK_DONE',
      entityTable: 'nx10_emp_task_log',
      entityId: row.id,
      summary: `Task done +${amount} EXP`,
      afterData: { taskLogId: row.id, ...out },
    });

    return { taskLogId: row.id, expEarned: amount, exp: out };
  }
}
