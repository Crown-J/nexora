// apps/nx-api/src/nx07/medical/medical.service.ts
// NX07 醫療管理 service（MedicalRecord + Injury 雙表共一個 service、Hank Q-H4 拍板）
//
// 對齊：
//   - overview v0.1.0 §4 醫療管理 + 職災追蹤（Crown Q1=b 亞羅特色 ⭐）
//   - audit-01 §6.3 醫療管理候選範式（年度健檢 / 職災通報 / 健康紀錄）
//   - 對齊 NX07 雙層脫敏範式（敏感資料：自己 vs 別人視角）
//
// 業務語意：
//   - MedicalRecord：年度健檢 / 特殊作業健檢 / 追蹤健檢
//   - Injury：職災通報、5 階流轉（REPORTED → TREATING → RECOVERED / DISABLED / FATAL）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreateInjuryDto,
  CreateMedicalRecordDto,
  PatchInjuryStatusDto,
  PatchMedicalRecordDto,
} from './dto/medical.dto';

@Injectable()
export class Nx07MedicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ===== Medical Record =====

  async listRecords(user: RequestUser, query?: { userId?: string }) {
    const tenantId = requireTenantId(user);
    const where: PrismaNs.Nx07MedicalRecordWhereInput = { tenantId };
    if (query?.userId) where.userId = query.userId.trim();
    const rows = await this.prisma.nx07MedicalRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
      take: 100,
    });
    return { ok: true, count: rows.length, rows };
  }

  async getRecord(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07MedicalRecord.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!row) throw new NotFoundException('Medical record not found');
    return { ok: true, row };
  }

  async createRecord(user: RequestUser, dto: CreateMedicalRecordDto) {
    const tenantId = requireTenantId(user);
    const userExists = await this.prisma.nx01User.findFirst({
      where: { id: dto.userId.trim(), tenantId },
      select: { id: true },
    });
    if (!userExists) throw new BadRequestException('userId not found in tenant');

    const created = await this.prisma.nx07MedicalRecord.create({
      data: {
        tenantId,
        userId: dto.userId.trim(),
        recordDate: new Date(dto.recordDate),
        recordType: dto.recordType ?? 'ANNUAL',
        examItems: dto.examItems ?? null,
        conclusion: dto.conclusion?.trim() ?? null,
        recommendation: dto.recommendation ?? null,
        doctorName: dto.doctorName?.trim() ?? null,
        hospitalName: dto.hospitalName?.trim() ?? null,
        attachmentUrl: dto.attachmentUrl?.trim() ?? null,
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'CREATE',
      entityTable: 'nx07_medical_record',
      entityId: created.id,
      summary: `醫療紀錄建立（${created.recordType}）`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  async patchRecord(user: RequestUser, id: string, dto: PatchMedicalRecordDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07MedicalRecord.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('Medical record not found');
    const updated = await this.prisma.nx07MedicalRecord.update({
      where: { id: existing.id },
      data: {
        ...(dto.recordType !== undefined ? { recordType: dto.recordType } : {}),
        ...(dto.examItems !== undefined ? { examItems: dto.examItems } : {}),
        ...(dto.conclusion !== undefined ? { conclusion: dto.conclusion?.trim() || null } : {}),
        ...(dto.recommendation !== undefined ? { recommendation: dto.recommendation } : {}),
        ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName?.trim() || null } : {}),
        ...(dto.hospitalName !== undefined ? { hospitalName: dto.hospitalName?.trim() || null } : {}),
        ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl?.trim() || null } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async deleteRecord(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07MedicalRecord.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true, userId: true },
    });
    if (!existing) throw new NotFoundException('Medical record not found');
    await this.prisma.nx07MedicalRecord.delete({ where: { id: existing.id } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_medical_record',
      entityId: existing.id,
      summary: '醫療紀錄刪除',
      beforeData: existing as object,
    });
    return { ok: true };
  }

  // ===== Injury =====

  async listInjuries(user: RequestUser, query?: { userId?: string; status?: string }) {
    const tenantId = requireTenantId(user);
    const where: PrismaNs.Nx07InjuryWhereInput = { tenantId };
    if (query?.userId) where.userId = query.userId.trim();
    if (query?.status) where.status = query.status.trim();
    const rows = await this.prisma.nx07Injury.findMany({
      where,
      orderBy: { injuryDate: 'desc' },
      take: 100,
    });
    return { ok: true, count: rows.length, rows };
  }

  async getInjury(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07Injury.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!row) throw new NotFoundException('Injury not found');
    return { ok: true, row };
  }

  async createInjury(user: RequestUser, dto: CreateInjuryDto) {
    const tenantId = requireTenantId(user);
    const userExists = await this.prisma.nx01User.findFirst({
      where: { id: dto.userId.trim(), tenantId },
      select: { id: true },
    });
    if (!userExists) throw new BadRequestException('userId not found in tenant');

    const created = await this.prisma.nx07Injury.create({
      data: {
        tenantId,
        userId: dto.userId.trim(),
        injuryDate: new Date(dto.injuryDate),
        injuryType: dto.injuryType ?? null,
        injuryLocation: dto.injuryLocation?.trim() ?? null,
        description: dto.description ?? null,
        status: 'REPORTED',
        attachmentUrl: dto.attachmentUrl?.trim() ?? null,
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'CREATE',
      entityTable: 'nx07_injury',
      entityId: created.id,
      summary: `職災通報（${created.injuryType ?? 'OTHER'}）`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  /** 職災狀態流轉：REPORTED → TREATING → RECOVERED / DISABLED / FATAL（最終態）。 */
  async patchInjuryStatus(user: RequestUser, id: string, dto: PatchInjuryStatusDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Injury.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('Injury not found');

    const validTransitions: Record<string, string[]> = {
      REPORTED: ['TREATING', 'RECOVERED', 'DISABLED', 'FATAL'],
      TREATING: ['RECOVERED', 'DISABLED', 'FATAL'],
      RECOVERED: [],
      DISABLED: [],
      FATAL: [],
    };
    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid injury status transition: ${existing.status} → ${dto.status}`,
      );
    }

    const updated = await this.prisma.nx07Injury.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        ...(dto.recoveryAt ? { recoveryAt: new Date(dto.recoveryAt) } : {}),
        ...(dto.insuranceClaim ? { insuranceClaim: new PrismaNs.Decimal(dto.insuranceClaim) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_injury',
      entityId: existing.id,
      summary: `職災狀態 ${existing.status} → ${dto.status}`,
      beforeData: { status: existing.status } as object,
      afterData: { status: dto.status } as object,
    });
    return { ok: true, row: updated };
  }
}
