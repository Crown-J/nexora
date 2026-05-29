// apps/nx-api/src/nx04/partner-grade-history/partner-grade-history.service.ts
// NX04-M2 §A C5：客戶等級變更核可 service
//
// 業務語意（Crown 2026-05-29 §A Q6 拍板）：
//   - 業務員 POST request：寫 history（status=PENDING）、oldGradeId 從當下 partner.customerGradeId snapshot
//   - G/負責人 POST approve：status=APPROVED + 同 tx 更新 partner.customerGradeId（生效）
//   - G/負責人 POST reject：status=REJECTED + 記錄退件原因
//   - GET list：partner 的變更歷史 + status filter
//   - ⚠️ RBAC enforce 列 FU-sales-lite-04（approve 應 OWNER only、本軌 class level @Roles 未細分）
//   - PENDING/REJECTED 不影響既有 QT（QT 已用 customerGradeId snapshot、純歷史記錄）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateGradeChangeRequestDto,
  ListGradeChangeQueryDto,
  RejectGradeChangeDto,
} from './dto/partner-grade-history.dto';

const PGH_SEL = {
  id: true,
  tenantId: true,
  partnerId: true,
  oldGradeId: true,
  newGradeId: true,
  status: true,
  requestedBy: true,
  requestedAt: true,
  reason: true,
  approvedBy: true,
  approvedAt: true,
  rejectReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PartnerGradeHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  async request(user: RequestUser, dto: CreateGradeChangeRequestDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // 1. 驗 partner 存在 + active + 是客戶（C 或 O）
      const partner = await tx.nx01Partner.findFirst({
        where: { id: dto.partnerId.trim(), tenantId, isActive: true, partnerType: { in: ['C', 'O'] } },
        select: { id: true, customerGradeId: true, code: true, name: true },
      });
      if (!partner) {
        throw new BadRequestException("partnerId must be an active partner with partnerType IN ('C', 'O')");
      }

      // 2. 驗 newGradeId 存在 + active
      const newGrade = await tx.nx01CustomerGrade.findFirst({
        where: { id: dto.newGradeId.trim(), tenantId, isActive: true },
        select: { id: true, code: true },
      });
      if (!newGrade) throw new BadRequestException('newGradeId invalid or inactive');

      // 3. 驗 oldGradeId 存在（partner 必須先有 customerGradeId 才能變更）
      if (!partner.customerGradeId) {
        throw new BadRequestException('partner has no current customerGradeId; assign one first before requesting change');
      }
      if (partner.customerGradeId === newGrade.id) {
        throw new BadRequestException('newGradeId is identical to current customerGradeId');
      }

      // 4. 不允許同 partner 重複 PENDING
      const pending = await tx.nx01PartnerGradeHistory.findFirst({
        where: { tenantId, partnerId: partner.id, status: 'PENDING' },
        select: { id: true, requestedAt: true },
      });
      if (pending) {
        throw new BadRequestException(
          `partner already has a PENDING grade change request (${pending.id}); approve or reject it first`,
        );
      }

      const row = await tx.nx01PartnerGradeHistory.create({
        data: {
          tenantId,
          partnerId: partner.id,
          oldGradeId: partner.customerGradeId,
          newGradeId: newGrade.id,
          status: 'PENDING',
          requestedBy: user.sub,
          requestedAt: new Date(),
          reason: dto.reason.trim(),
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PGH_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx01_partner_grade_history',
        entityId: row.id,
        entityCode: `${partner.code} ${partner.name}`,
        summary: `客戶等級變更申請（${partner.customerGradeId} → ${newGrade.id}）`,
        afterData: row as object,
      });

      return row;
    });
  }

  async approve(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01PartnerGradeHistory.findFirst({
        where: { id, tenantId },
        select: PGH_SEL,
      });
      if (!existing) throw new NotFoundException('Grade change request not found');
      if (existing.status !== 'PENDING') {
        throw new BadRequestException(`Cannot approve: status is ${existing.status}, not PENDING`);
      }

      // 更新 history
      const row = await tx.nx01PartnerGradeHistory.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: user.sub,
          approvedAt: new Date(),
          updatedBy: user.sub,
        },
        select: PGH_SEL,
      });

      // 同 tx 更新 partner.customerGradeId（生效）
      await tx.nx01Partner.update({
        where: { id: existing.partnerId },
        data: { customerGradeId: existing.newGradeId, updatedBy: user.sub },
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'UPDATE',
        entityTable: 'nx01_partner_grade_history',
        entityId: id,
        entityCode: existing.partnerId,
        summary: `客戶等級變更核可（${existing.oldGradeId} → ${existing.newGradeId}、partner.customerGradeId 同步更新）`,
        beforeData: existing as object,
        afterData: row as object,
      });

      return row;
    });
  }

  async reject(user: RequestUser, id: string, dto: RejectGradeChangeDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01PartnerGradeHistory.findFirst({
        where: { id, tenantId },
        select: PGH_SEL,
      });
      if (!existing) throw new NotFoundException('Grade change request not found');
      if (existing.status !== 'PENDING') {
        throw new BadRequestException(`Cannot reject: status is ${existing.status}, not PENDING`);
      }

      const row = await tx.nx01PartnerGradeHistory.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectReason: dto.rejectReason.trim(),
          approvedBy: user.sub, // 紀錄誰退件
          approvedAt: new Date(),
          updatedBy: user.sub,
        },
        select: PGH_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'UPDATE',
        entityTable: 'nx01_partner_grade_history',
        entityId: id,
        entityCode: existing.partnerId,
        summary: `客戶等級變更退件（partner 不變、原因：${dto.rejectReason.trim()}）`,
        beforeData: existing as object,
        afterData: row as object,
      });

      return row;
    });
  }

  async list(user: RequestUser, q: ListGradeChangeQueryDto) {
    const tenantId = requireTenantId(user);
    const where: Prisma.Nx01PartnerGradeHistoryWhereInput = { tenantId };
    if (q.partnerId?.trim()) where.partnerId = q.partnerId.trim();
    if (q.status?.trim()) where.status = q.status.trim();
    const rows = await this.prisma.nx01PartnerGradeHistory.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      take: 200,
      select: PGH_SEL,
    });
    return { items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartnerGradeHistory.findFirst({
      where: { id, tenantId },
      select: PGH_SEL,
    });
    if (!row) throw new NotFoundException('Grade change request not found');
    return row;
  }
}
