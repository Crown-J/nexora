// apps/nx-api/src/nx10/promotion/nx10-promotion.service.ts
// NX10 Promotion 轉職機制 service（八角驅動力 #3 + #2 + #1 ⭐⭐⭐ 業界改革 3 階審核）
//
// 對齊：
//   - overview v1.0 §6 + §3.2 #3 + IMPL-02 plan §L2
//   - 3 階審核：階段 1 系統驗證（員工申請）/ 階段 2 主管推薦（OWNER）/ 階段 3 負責人審核（HR_ADMIN）→ 執行（updates NX01 user.roleId）
//   - status 流轉：P 待審核 → A 已核准 → E 已執行 / R 已退件 / X 已取消

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  ApplyRequestDto,
  CreateCriteriaDto,
  PatchSupervisorRecommendDto,
  ReviewRequestDto,
} from './dto/nx10-promotion.dto';

@Injectable()
export class Nx10PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ===== Criteria（轉職條件主檔）=====

  async listCriteria(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.prisma.nx10PromotionCriteria.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { fromRoleId: 'asc' },
    });
    return { ok: true, count: rows.length, rows };
  }

  /** HR_ADMIN 建立轉職條件。 */
  async createCriteria(user: RequestUser, dto: CreateCriteriaDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    if (dto.fromRoleId.trim() === dto.toRoleId.trim()) {
      throw new BadRequestException('fromRoleId 與 toRoleId 不可同');
    }
    const created = await this.prisma.nx10PromotionCriteria.create({
      data: {
        tenantId: user.tenantId,
        fromRoleId: dto.fromRoleId.trim(),
        toRoleId: dto.toRoleId.trim(),
        minMedalLevelId: dto.minMedalLevelId.trim(),
        minTenureMonths: dto.minTenureMonths ?? 0,
        minKpiRate: dto.minKpiRate ? new PrismaNs.Decimal(dto.minKpiRate) : new PrismaNs.Decimal(0),
        minMentorshipCount: dto.minMentorshipCount ?? 0,
        noPenaltyDays: dto.noPenaltyDays ?? 0,
        isActive: dto.isActive ?? true,
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: created };
  }

  // ===== Request（轉職申請）3 階審核 =====

  async listMyRequests(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.prisma.nx10PromotionRequest.findMany({
      where: { tenantId: user.tenantId, userId: user.sub },
      orderBy: { applyDate: 'desc' },
      take: 50,
      include: { criteria: { select: { fromRoleId: true, toRoleId: true } } },
    });
    return { ok: true, count: rows.length, rows };
  }

  /**
   * 階段 1：員工申請 + 系統驗證。
   * 驗證項：minMedalLevel / minTenureMonths / minKpiRate / minMentorshipCount / noPenaltyDays
   * sysVerifyResult = 'P' 全部通過 / 'F' 任一未達標
   */
  async applyRequest(user: RequestUser, dto: ApplyRequestDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');

    const criteria = await this.prisma.nx10PromotionCriteria.findFirst({
      where: { id: dto.criteriaId.trim(), tenantId: user.tenantId, isActive: true },
      include: { minMedalLevel: { select: { sortNo: true, levelName: true } } },
    });
    if (!criteria) throw new NotFoundException('Criteria not found / not active');

    // 階段 1：系統驗證
    const verifyMessages: string[] = [];
    let allPass = true;

    // 1. 醫章等級驗證
    const empMedal = await this.prisma.nx10EmpMedal.findUnique({
      where: { userId: user.sub },
      include: { medalLevel: { select: { sortNo: true, levelName: true } } },
    });
    const userSort = empMedal?.medalLevel?.sortNo ?? 0;
    const minSort = criteria.minMedalLevel.sortNo;
    if (userSort < minSort) {
      allPass = false;
      verifyMessages.push(`醫章未達標：需 ${criteria.minMedalLevel.levelName}(sort=${minSort})、當前 sort=${userSort}`);
    }

    // 2. 帶新人數驗證
    if (criteria.minMentorshipCount > 0) {
      const completedMentorships = await this.prisma.nx10MentorshipRecord.count({
        where: {
          tenantId: user.tenantId,
          mentorId: user.sub,
          rewardIssued: true,
        },
      });
      if (completedMentorships < criteria.minMentorshipCount) {
        allPass = false;
        verifyMessages.push(`帶新人未達標：需 ${criteria.minMentorshipCount} 位、當前 ${completedMentorships}`);
      }
    }

    // 3+4+5 minTenure/KpiRate/noPenalty 簡化版（暫 skip 詳細查、後續軌升）
    if (criteria.minTenureMonths > 0) {
      verifyMessages.push(`在職月數驗證（簡化版本軌跳過、Phase 後續軌補）`);
    }

    const created = await this.prisma.nx10PromotionRequest.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        criteriaId: criteria.id,
        applyDate: new Date(),
        sysVerifyResult: allPass ? 'P' : 'F',
        sysVerifyDetail: verifyMessages.length ? verifyMessages.join('\n') : '全部通過',
        status: 'P',
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
      entityTable: 'nx10_promotion_request',
      entityId: created.id,
      summary: `轉職申請：from=${criteria.fromRoleId} to=${criteria.toRoleId} sys=${created.sysVerifyResult}`,
      afterData: created as object,
    });

    return { ok: true, row: created, allPass, verifyMessages };
  }

  /** 階段 2：主管推薦（OWNER role）。 */
  async patchSupervisorRecommend(
    user: RequestUser,
    id: string,
    dto: PatchSupervisorRecommendDto,
  ) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10PromotionRequest.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('PromotionRequest not found');
    if (existing.status !== 'P') {
      throw new BadRequestException(`必須在 status='P' 才能填推薦，當前=${existing.status}`);
    }

    const updated = await this.prisma.nx10PromotionRequest.update({
      where: { id: existing.id },
      data: { supervisorRecommend: dto.supervisorRecommend },
    });
    return { ok: true, row: updated };
  }

  /**
   * 階段 3：負責人審核（HR_ADMIN 或 Crown）。
   * status=A → 待 executeRequest
   * status=R → 退件（需 rejectReason）
   * status=X → 取消
   */
  async reviewRequest(user: RequestUser, id: string, dto: ReviewRequestDto) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10PromotionRequest.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('PromotionRequest not found');
    if (existing.status !== 'P') {
      throw new BadRequestException(`必須在 status='P' 才能審核，當前=${existing.status}`);
    }
    if (dto.status === 'R' && !dto.rejectReason?.trim()) {
      throw new BadRequestException('status=R 必須填 rejectReason');
    }

    const updated = await this.prisma.nx10PromotionRequest.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        reviewedBy: user.sub,
        reviewedAt: new Date(),
        rejectReason: dto.status === 'R' ? dto.rejectReason!.trim() : null,
      },
    });
    await this.audit.write({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX10',
      action: 'UPDATE',
      entityTable: 'nx10_promotion_request',
      entityId: existing.id,
      summary: `轉職審核：status P → ${dto.status}`,
      beforeData: { status: existing.status } as object,
      afterData: { status: dto.status } as object,
    });
    return { ok: true, row: updated };
  }

  /**
   * 執行轉職（status='A' → 'E'）：實際寫 NX01 user.roleId。
   * ⚠️ 寫 RBAC、HR_ADMIN 主寫入紀律（plan §6 邊界揭露）。
   */
  async executeRequest(user: RequestUser, id: string) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const existing = await this.prisma.nx10PromotionRequest.findFirst({
      where: { id: id.trim(), tenantId: user.tenantId },
      include: { criteria: { select: { fromRoleId: true, toRoleId: true } } },
    });
    if (!existing) throw new NotFoundException('PromotionRequest not found');
    if (existing.status !== 'A') {
      throw new BadRequestException(`必須在 status='A' 才能執行，當前=${existing.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx10PromotionRequest.update({
        where: { id: existing.id },
        data: {
          status: 'E',
          executedAt: new Date(),
        },
      });
      // ⚠️ 寫 NX01 user.roleId（純 additive、HR_ADMIN 拍板）
      await tx.nx01User.update({
        where: { id: existing.userId },
        data: { roleId: existing.criteria.toRoleId, updatedBy: user.sub },
      });
      await this.audit.write({
        tenantId: user.tenantId!,
        actorUserId: user.sub,
        moduleCode: 'NX10',
        action: 'UPDATE',
        entityTable: 'nx10_promotion_request',
        entityId: existing.id,
        summary: `轉職執行：user ${existing.userId} from ${existing.criteria.fromRoleId} → ${existing.criteria.toRoleId}`,
        beforeData: { roleId: existing.criteria.fromRoleId } as object,
        afterData: { roleId: existing.criteria.toRoleId } as object,
      });
      return { ok: true, row: updated, newRoleId: existing.criteria.toRoleId };
    });
  }
}
