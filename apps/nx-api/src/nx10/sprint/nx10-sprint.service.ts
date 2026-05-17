// apps/nx-api/src/nx10/sprint/nx10-sprint.service.ts
// NX10 Sprint service（八角驅動力 #6 稀缺與渴望 ⭐ 限時挑戰 + 創造緊迫感）
//
// 對齊：
//   - overview v0.1.0 §1.2 驅動力 #6
//   - audit-01 §6.2 業界 muscle memory #8 衝刺
//   - plan §L3 + Hank Q-H8：週衝刺 ×2 / 月末 ×1.5 / 季度 ×3
//
// 業務語意：
//   - listActive：當前進行中衝刺（員工 self-view + 主管 cross-view）
//   - getById：單衝刺詳情
//   - createSprint：HR_ADMIN 管理
//   - patchSprint：HR_ADMIN（不可改 startDate/sprintType 保留 schema 一致性）
//   - getMyParticipation：個人衝刺參與紀錄（跨 Nx10SprintTaskLog、後續軌補完）

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateSprintDto, PatchSprintDto } from './dto/nx10-sprint.dto';

@Injectable()
export class Nx10SprintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 當前進行中衝刺（startDate ≤ today ≤ endDate + isActive）。 */
  async listActive(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const today = new Date();
    const rows = await this.prisma.nx10SprintTask.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { endDate: 'asc' },
      take: 50,
    });
    return { ok: true, today: today.toISOString().slice(0, 10), count: rows.length, rows };
  }

  async getById(user: RequestUser, id: string) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const row = await this.prisma.nx10SprintTask.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!row) throw new NotFoundException('Sprint not found');
    return { ok: true, row };
  }

  /** HR_ADMIN 建立衝刺。 */
  async createSprint(user: RequestUser, dto: CreateSprintDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) throw new BadRequestException('endDate must be after startDate');

    const multiplier = new PrismaNs.Decimal(dto.expMultiplier);
    if (multiplier.lte(0)) throw new BadRequestException('expMultiplier must be positive');

    const created = await this.prisma.nx10SprintTask.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        sprintType: dto.sprintType,
        startDate,
        endDate,
        expMultiplier: multiplier,
        targetDesc: dto.targetDesc?.trim() ?? null,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX10',
      action: 'CREATE',
      entityTable: 'nx10_sprint_task',
      entityId: created.id,
      summary: `Sprint 建立：${created.name}（${created.sprintType}×${multiplier.toString()}）`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  /** HR_ADMIN 修改衝刺（不允許改 startDate / sprintType）。 */
  async patchSprint(user: RequestUser, id: string, dto: PatchSprintDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10SprintTask.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Sprint not found');

    const updated = await this.prisma.nx10SprintTask.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.expMultiplier !== undefined ? { expMultiplier: new PrismaNs.Decimal(dto.expMultiplier) } : {}),
        ...(dto.targetDesc !== undefined ? { targetDesc: dto.targetDesc?.trim() ?? null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  /** 個人衝刺參與紀錄（後續軌完整補 SprintTaskLog）。 */
  async getMyParticipation(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.prisma.nx10SprintTaskLog.findMany({
      where: { tenantId: user.tenantId, userId: user.sub },
      orderBy: { calculatedAt: 'desc' },
      take: 50,
      include: { sprintTask: { select: { id: true, name: true, sprintType: true, expMultiplier: true } } },
    });
    return { ok: true, count: rows.length, rows };
  }
}
