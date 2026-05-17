// apps/nx-api/src/nx10/team-task/nx10-team-task.service.ts
// NX10 TeamTask service（八角驅動力 #5 社交影響 ⭐ 跨部門協作）
//
// 對齊：
//   - overview v1.0 §3.2 #1 + IMPL-02 plan §L2
//   - schema 既有 Nx10TeamTask + Nx10TeamTaskLog（schema-only、本軌新建 service）

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateTeamTaskDto, PatchTeamTaskDto } from './dto/nx10-team-task.dto';

@Injectable()
export class Nx10TeamTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 列團隊任務（全員可讀、員工 self filter by 倉庫）。 */
  async listTasks(user: RequestUser, query?: { warehouseId?: string }) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const where: PrismaNs.Nx10TeamTaskWhereInput = { tenantId: user.tenantId, isActive: true };
    if (query?.warehouseId) where.warehouseId = query.warehouseId.trim();
    const rows = await this.prisma.nx10TeamTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { ok: true, count: rows.length, rows };
  }

  async getById(user: RequestUser, id: string) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const row = await this.prisma.nx10TeamTask.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!row) throw new NotFoundException('TeamTask not found');
    return { ok: true, row };
  }

  /** HR_ADMIN 建立。 */
  async createTask(user: RequestUser, dto: CreateTeamTaskDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');

    const target = new PrismaNs.Decimal(dto.targetValue);
    if (target.lt(0) || target.gt(999.99)) {
      throw new BadRequestException('targetValue 0~999.99');
    }

    const created = await this.prisma.nx10TeamTask.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        targetType: dto.targetType,
        targetValue: target,
        taskCycle: dto.taskCycle,
        rewardExp: dto.rewardExp,
        warehouseId: dto.warehouseId?.trim() ?? null,
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
      entityTable: 'nx10_team_task',
      entityId: created.id,
      summary: `TeamTask 建立：${created.name}（${created.targetType} ${target.toString()}%）`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  async patchTask(user: RequestUser, id: string, dto: PatchTeamTaskDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10TeamTask.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('TeamTask not found');

    const updated = await this.prisma.nx10TeamTask.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.targetValue !== undefined ? { targetValue: new PrismaNs.Decimal(dto.targetValue) } : {}),
        ...(dto.rewardExp !== undefined ? { rewardExp: dto.rewardExp } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  /** 個人所在倉庫 TeamTaskLog 歷史（透過 Nx01UserWarehouse 推員工所屬倉）。 */
  async listMyAchievements(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    // 簡化版：直接列租戶內所有 TeamTaskLog（後續軌可加 user→warehouse filter）
    const rows = await this.prisma.nx10TeamTaskLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { calculatedAt: 'desc' },
      take: 50,
      include: { teamTask: { select: { name: true, targetType: true, rewardExp: true } } },
    });
    return { ok: true, count: rows.length, rows };
  }
}
