// apps/nx-api/src/nx10/mentorship/nx10-mentorship.service.ts
// NX10 Mentorship service（八角驅動力 #5 + #1 ⭐⭐⭐ 業界遊戲化罕見）
//
// 對齊：
//   - overview v1.0 §7 + §3.2 #2 + IMPL-02 plan §L2

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx10ExpService } from '../exp/nx10-exp.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePairDto, PatchEndDto } from './dto/nx10-mentorship.dto';

@Injectable()
export class Nx10MentorshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exp: Nx10ExpService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 列個人作為 mentor / mentee 的紀錄。 */
  async listMine(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.prisma.nx10MentorshipRecord.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ mentorId: user.sub }, { menteeId: user.sub }],
      },
      orderBy: { startDate: 'desc' },
      take: 50,
    });
    return { ok: true, count: rows.length, rows };
  }

  /** HR_ADMIN 指派師徒配對。 */
  async createPair(user: RequestUser, dto: CreatePairDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    if (dto.mentorId.trim() === dto.menteeId.trim()) {
      throw new BadRequestException('mentor 與 mentee 不可同人');
    }

    const created = await this.prisma.nx10MentorshipRecord.create({
      data: {
        tenantId: user.tenantId,
        mentorId: dto.mentorId.trim(),
        menteeId: dto.menteeId.trim(),
        startDate: new Date(dto.startDate),
        rewardExp: dto.rewardExp ?? 500,
        rewardIssued: false,
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX10',
      action: 'CREATE',
      entityTable: 'nx10_mentorship_record',
      entityId: created.id,
      summary: `師徒配對：mentor=${dto.mentorId} mentee=${dto.menteeId} reward=${created.rewardExp}`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  /** HR_ADMIN 結束帶新人（記 endDate + menteeKpiRate）。 */
  async patchEnd(user: RequestUser, id: string, dto: PatchEndDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10MentorshipRecord.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Mentorship record not found');
    if (existing.endDate) throw new BadRequestException('Mentorship already ended');

    const kpiRate = new PrismaNs.Decimal(dto.menteeKpiRate);
    const updated = await this.prisma.nx10MentorshipRecord.update({
      where: { id: existing.id },
      data: {
        endDate: new Date(dto.endDate),
        menteeKpiRate: kpiRate,
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() ?? null } : {}),
      },
    });
    return { ok: true, row: updated };
  }

  /**
   * HR_ADMIN 發放帶新人獎勵（手動觸發、需 mentee KPI 達標通常 ≥ 70%）。
   * 寫 rewardIssued=true + issuedAt + applyExpChange 給 mentor。
   */
  async issueReward(user: RequestUser, id: string) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10MentorshipRecord.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Mentorship record not found');
    if (existing.rewardIssued) throw new BadRequestException('Reward already issued');
    if (!existing.endDate) throw new BadRequestException('Mentorship 尚未結束、需先 patchEnd');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx10MentorshipRecord.update({
        where: { id: existing.id },
        data: {
          rewardIssued: true,
          issuedAt: new Date(),
        },
      });
      await this.exp.applyExpChange(tx, {
        tenantId: user.tenantId!,
        userId: existing.mentorId,
        amount: existing.rewardExp,
        sourceType: 'MT',
        reason: `師徒獎勵：mentee ${existing.menteeId} KPI ${existing.menteeKpiRate.toString()}% +${existing.rewardExp} Exp`,
        sourceRefId: existing.id,
        actorUserId: user.sub,
      });
      return { ok: true, row: updated, rewardedToMentor: existing.mentorId, exp: existing.rewardExp };
    });
  }
}
