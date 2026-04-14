import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { Nx10ExpAwardDto } from './dto/nx10-exp-award.dto';

@Injectable()
export class Nx10ExpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private async lowestMedalLevel(tx: Prisma.TransactionClient, tenantId: string) {
    const row = await tx.nx10MedalLevel.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { sortNo: 'asc' },
    });
    if (!row) throw new BadRequestException('nx10_medal_level not configured for tenant');
    return row;
  }

  private async resolveMedalForTotal(
    tx: Prisma.TransactionClient,
    tenantId: string,
    totalExp: number,
  ) {
    const levels = await tx.nx10MedalLevel.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortNo: 'asc' },
    });
    if (!levels.length) throw new BadRequestException('nx10_medal_level not configured');
    let chosen = levels[0];
    for (const l of levels) {
      if (l.expThreshold <= totalExp) chosen = l;
    }
    const idx = levels.findIndex((x) => x.id === chosen.id);
    const next = idx >= 0 && idx + 1 < levels.length ? levels[idx + 1] : null;
    return { current: chosen, next };
  }

  async ensureEmpMedal(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    let row = await tx.nx10EmpMedal.findUnique({ where: { userId } });
    if (row) {
      if (row.tenantId !== tenantId) throw new ForbiddenException('User medal tenant mismatch');
      return row;
    }
    const low = await this.lowestMedalLevel(tx, tenantId);
    row = await tx.nx10EmpMedal.create({
      data: {
        tenantId,
        userId,
        medalLevelId: low.id,
        totalExp: 0,
        currentLevelExp: low.expThreshold,
        consecutiveCheckin: 0,
      },
    });
    return row;
  }

  /**
   * 在交易內寫入 nx10_emp_exp_log、更新 nx10_emp_medal（含勳章晉級與 current_level_exp）。
   */
  async applyExpChange(
    tx: Prisma.TransactionClient,
    opts: {
      tenantId: string;
      userId: string;
      amount: number;
      sourceType: string;
      reason: string;
      sourceRefId?: string | null;
      actorUserId: string;
    },
  ) {
    if (!Number.isFinite(opts.amount) || opts.amount === 0) {
      throw new BadRequestException('amount must be non-zero finite');
    }
    const medalRow = await this.ensureEmpMedal(tx, opts.tenantId, opts.userId);
    const newTotal = Math.max(0, medalRow.totalExp + opts.amount);
    const { current, next } = await this.resolveMedalForTotal(tx, opts.tenantId, newTotal);

    await tx.nx10EmpExpLog.create({
      data: {
        tenantId: opts.tenantId,
        userId: opts.userId,
        sourceType: opts.sourceType,
        expChange: opts.amount,
        expAfter: newTotal,
        sourceRefId: opts.sourceRefId ?? undefined,
        reason: opts.reason.slice(0, 200),
        createdBy: opts.actorUserId,
      },
    });

    await tx.nx10EmpMedal.update({
      where: { userId: opts.userId },
      data: {
        totalExp: newTotal,
        medalLevelId: current.id,
        currentLevelExp: current.expThreshold,
      },
    });

    return {
      totalExp: newTotal,
      medalLevelId: current.id,
      levelCode: current.levelCode,
      levelName: current.levelName,
      nextLevelExp: next?.expThreshold ?? null,
      expToNext: next ? Math.max(0, next.expThreshold - newTotal) : 0,
    };
  }

  private async buildExpView(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    const medal = await tx.nx10EmpMedal.findUnique({
      where: { userId },
      include: { medalLevel: true },
    });
    if (!medal || medal.tenantId !== tenantId) {
      const low = await this.lowestMedalLevel(tx, tenantId);
      const { next } = await this.resolveMedalForTotal(tx, tenantId, 0);
      return {
        userId,
        totalExp: 0,
        medalLevelId: low.id,
        currentLevelCode: low.levelCode,
        currentLevelName: low.levelName,
        currentLevelExp: 0,
        nextLevelExp: next?.expThreshold ?? null,
        expToNext: next ? next.expThreshold : 0,
        lastCheckinDate: null,
        consecutiveCheckin: 0,
      };
    }
    const { next } = await this.resolveMedalForTotal(tx, tenantId, medal.totalExp);
    return {
      userId,
      totalExp: medal.totalExp,
      medalLevelId: medal.medalLevelId,
      currentLevelCode: medal.medalLevel.levelCode,
      currentLevelName: medal.medalLevel.levelName,
      currentLevelExp: medal.currentLevelExp,
      nextLevelExp: next?.expThreshold ?? null,
      expToNext: next ? Math.max(0, next.expThreshold - medal.totalExp) : 0,
      lastCheckinDate: medal.lastCheckinDate,
      consecutiveCheckin: medal.consecutiveCheckin,
    };
  }

  async getMe(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return this.prisma.$transaction((tx) => this.buildExpView(tx, user.tenantId!, user.sub));
  }

  async getByUserId(actor: RequestUser, targetUserId: string) {
    if (!actor.tenantId) throw new ForbiddenException('Tenant required');
    const target = await this.prisma.nx01User.findFirst({
      where: { id: targetUserId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    return this.prisma.$transaction((tx) => this.buildExpView(tx, actor.tenantId!, targetUserId));
  }

  async award(actor: RequestUser, dto: Nx10ExpAwardDto) {
    if (!actor.tenantId) throw new ForbiddenException('Tenant required');
    const target = await this.prisma.nx01User.findFirst({
      where: { id: dto.userId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const reason = `[${dto.sourceModule}] ${dto.reason}`.slice(0, 200);
    const out = await this.prisma.$transaction(async (tx) => {
      const r = await this.applyExpChange(tx, {
        tenantId: actor.tenantId!,
        userId: dto.userId,
        amount: dto.amount,
        sourceType: 'MS',
        reason,
        actorUserId: actor.sub,
      });
      return r;
    });

    await this.audit.write({
      tenantId: actor.tenantId,
      actorUserId: actor.sub,
      moduleCode: 'NX10',
      action: 'EXP_AWARD',
      entityTable: 'nx10_emp_exp_log',
      entityId: dto.userId,
      summary: `Award +${dto.amount} EXP (${dto.sourceModule})`,
      afterData: { userId: dto.userId, amount: dto.amount, ...out },
    });

    return out;
  }
}
