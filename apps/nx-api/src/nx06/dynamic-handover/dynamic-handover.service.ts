// apps/nx-api/src/nx06/dynamic-handover/dynamic-handover.service.ts
// NX06 動態任務轉派 service（亞羅簡化版：半徑 + 任務量平衡 + ETA、半自動倉管組長拍板）
//
// 對齊：
//   - overview v0.2.0 §4.3（動態任務轉派 ⭐⭐⭐、業界中小汽配 ERP 業界第一個）
//   - Hank Q-H5：預設 5 km 半徑、env override
//   - 業務拍板：半自動倉管組長拍板（非全自動 AI）
//
// 演算法 3 步驟：
//   Step 1 半徑判斷：DN 起點 → 候選 driver 池（haversine < radiusKm）
//   Step 2 任務量平衡：過濾任務量 > maxLoadPerDriver 的 driver
//   Step 3 ETA 估算：候選池前 3 名提供倉管組長拍板（不 auto-assign）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { Nx10ExpService } from '../../nx10/exp/nx10-exp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { estimateDurationSec, haversineKm } from '../../shared/nx06/nx06-haversine';
import { createRewardFromHandover } from '../../shared/nx10/nx10-create-reward-from-handover';

import type {
  CreateHandoverDto,
  SuggestHandoverDto,
  UpdateHandoverStatusDto,
} from './dto/dynamic-handover.dto';

const DEFAULT_RADIUS_KM = Number(process.env.NX06_HANDOVER_DEFAULT_RADIUS_KM ?? '5');
const DEFAULT_MAX_LOAD = Number(process.env.NX06_HANDOVER_DEFAULT_MAX_LOAD ?? '10');

@Injectable()
export class DynamicHandoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly expService: Nx10ExpService,
  ) {}

  /**
   * Step 1+2+3：對某 DN 推薦動態交接候選（演算法輸入）。
   * 回傳前 3 名 driver + 推薦理由、倉管組長拍板後呼叫 createHandover。
   */
  async suggestCandidates(user: RequestUser, dto: SuggestHandoverDto) {
    const tenantId = requireTenantId(user);
    const radiusKm = dto.radiusKm ?? DEFAULT_RADIUS_KM;
    const maxLoad = dto.maxLoadPerDriver ?? DEFAULT_MAX_LOAD;

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { id: dto.dnId.trim(), tenantId },
      select: {
        id: true,
        docNo: true,
        status: true,
        driverUserId: true,
        lastLat: true,
        lastLng: true,
      },
    });
    if (!dn) throw new NotFoundException('DN not found');
    if (!dn.lastLat || !dn.lastLng) {
      throw new BadRequestException(
        'DN missing GPS coords (lastLat/Lng required for handover algorithm)',
      );
    }
    const dnPoint = { lat: Number(dn.lastLat), lng: Number(dn.lastLng) };

    // Step 1：候選 driver 池（所有 active driver、排除原 driver）
    const candidates = await this.prisma.nx06Dn.findMany({
      where: {
        tenantId,
        status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
        driverUserId: { not: dn.driverUserId },
        lastLat: { not: null },
        lastLng: { not: null },
      },
      select: {
        driverUserId: true,
        lastLat: true,
        lastLng: true,
        driverUser: { select: { id: true, userName: true } },
      },
    });

    // 對 driver 去重（取最新位置）、計算半徑
    const driverMap = new Map<string, { driverUserId: string; userName: string; lat: number; lng: number; distanceKm: number }>();
    for (const c of candidates) {
      if (!c.lastLat || !c.lastLng) continue;
      const lat = Number(c.lastLat);
      const lng = Number(c.lastLng);
      const distKm = haversineKm(dnPoint, { lat, lng });
      if (distKm > radiusKm) continue;
      const existing = driverMap.get(c.driverUserId);
      if (!existing || existing.distanceKm > distKm) {
        driverMap.set(c.driverUserId, {
          driverUserId: c.driverUserId,
          userName: c.driverUser.userName,
          lat,
          lng,
          distanceKm: distKm,
        });
      }
    }

    if (!driverMap.size) {
      return {
        ok: true,
        dnId: dn.id,
        docNo: dn.docNo,
        radiusKm,
        maxLoad,
        candidates: [],
        message: `No drivers within ${radiusKm} km radius`,
      };
    }

    // Step 2：任務量過濾
    const taskCounts = await this.prisma.nx06Dn.groupBy({
      by: ['driverUserId'],
      where: {
        tenantId,
        driverUserId: { in: Array.from(driverMap.keys()) },
        status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
      },
      _count: { _all: true },
    });
    const loadMap = new Map(taskCounts.map((t) => [t.driverUserId, t._count._all]));
    const filtered: Array<{ driverUserId: string; userName: string; distanceKm: number; etaSec: number; load: number; score: number }> = [];
    for (const c of driverMap.values()) {
      const load = loadMap.get(c.driverUserId) ?? 0;
      if (load >= maxLoad) continue;
      const etaSec = estimateDurationSec(c.distanceKm);
      // score：距離 + 任務量平衡 penalty（多任務的 driver +0.3 km penalty per task）
      const score = c.distanceKm + load * 0.3;
      filtered.push({
        driverUserId: c.driverUserId,
        userName: c.userName,
        distanceKm: Math.round(c.distanceKm * 100) / 100,
        etaSec,
        load,
        score: Math.round(score * 100) / 100,
      });
    }

    // Step 3：前 3 名（score 升序）
    filtered.sort((a, b) => a.score - b.score);
    const top3 = filtered.slice(0, 3).map((f) => ({
      driverUserId: f.driverUserId,
      userName: f.userName,
      distanceKm: f.distanceKm,
      etaSec: f.etaSec,
      currentLoad: f.load,
      reason: `半徑 ${f.distanceKm} km / 任務量 ${f.load} / ETA ${Math.round(f.etaSec / 60)} 分`,
    }));

    return {
      ok: true,
      dnId: dn.id,
      docNo: dn.docNo,
      radiusKm,
      maxLoad,
      currentDriverUserId: dn.driverUserId,
      candidates: top3,
    };
  }

  /** 倉管組長拍板：建立 Handover 紀錄（status='SUGGESTED'）。 */
  async createHandover(user: RequestUser, dto: CreateHandoverDto) {
    const tenantId = requireTenantId(user);

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { id: dto.dnId.trim(), tenantId },
      select: { id: true, docNo: true, driverUserId: true, status: true },
    });
    if (!dn) throw new NotFoundException('DN not found');
    if (dn.status === 'COMPLETED' || dn.status === 'CANCELLED' || dn.status === 'VOIDED') {
      throw new BadRequestException(
        `Cannot create handover for DN in terminal status='${dn.status}'`,
      );
    }
    if (dn.driverUserId === dto.toDriverId.trim()) {
      throw new BadRequestException('toDriverId must differ from current driver');
    }

    const toDriver = await this.prisma.nx01User.findFirst({
      where: { id: dto.toDriverId.trim(), tenantId, isActive: true },
      select: { id: true, userName: true },
    });
    if (!toDriver) throw new BadRequestException('toDriverId not found or inactive');

    const created = await this.prisma.nx06DnHandover.create({
      data: {
        tenantId,
        dnId: dn.id,
        fromDriverId: dn.driverUserId,
        toDriverId: toDriver.id,
        handoverLat: dto.handoverLat ? new PrismaNs.Decimal(dto.handoverLat) : null,
        handoverLng: dto.handoverLng ? new PrismaNs.Decimal(dto.handoverLng) : null,
        handoverAddress: dto.handoverAddress?.trim() || null,
        reason: dto.reason?.trim() || null,
        suggestedBy: user.sub,
        updatedBy: user.sub,
      },
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX06',
      action: 'CREATE',
      entityTable: 'nx06_dn_handover',
      entityId: created.id,
      entityCode: dn.docNo,
      summary: `動態交接建議：${dn.driverUserId} → ${toDriver.id}（${dto.reason ?? 'manual'}）`,
      afterData: created as object,
    });

    return { ok: true, handover: created };
  }

  /** 變更 handover 狀態（ACCEPTED → COMPLETED → CANCELLED 等）。 */
  async updateStatus(user: RequestUser, handoverId: string, dto: UpdateHandoverStatusDto) {
    const tenantId = requireTenantId(user);

    const existing = await this.prisma.nx06DnHandover.findFirst({
      where: { id: handoverId.trim(), tenantId },
      select: {
        id: true,
        dnId: true,
        fromDriverId: true,
        toDriverId: true,
        status: true,
      },
    });
    if (!existing) throw new NotFoundException('Handover not found');

    // 狀態流轉 guard（簡化版）
    const validTransitions: Record<string, string[]> = {
      SUGGESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['COMPLETED', 'CANCELLED'],
      REJECTED: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid handover transition: ${existing.status} → ${dto.status}`,
      );
    }

    const now = new Date();
    const updated = await this.prisma.nx06DnHandover.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        ...(dto.status === 'ACCEPTED' ? { acceptedAt: now } : {}),
        ...(dto.status === 'COMPLETED' ? { completedAt: now } : {}),
        updatedBy: user.sub,
      },
    });

    // COMPLETED 時：實際轉移 dn.driverUserId
    if (dto.status === 'COMPLETED') {
      await this.prisma.nx06Dn.update({
        where: { id: existing.dnId },
        data: { driverUserId: existing.toDriverId, updatedBy: user.sub },
      });

      // NX10 wire：fromDriver + toDriver 各 25 Exp 動態交接協作獎勵（業界改革 ⭐⭐⭐）
      // try/catch 隔離：wire 失敗不阻擋 handover.updateStatus 主流程
      try {
        await this.prisma.$transaction(async (tx) => {
          await createRewardFromHandover(tx, this.expService, {
            tenantId,
            handoverId: existing.id,
            actorUserId: user.sub,
          });
        });
      } catch (err) {
        console.warn(
          `[NX10 wire] createRewardFromHandover failed for handover ${existing.id}:`,
          err,
        );
      }
    }

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX06',
      action: 'UPDATE',
      entityTable: 'nx06_dn_handover',
      entityId: existing.id,
      summary: `動態交接 ${existing.status} → ${dto.status}`,
      beforeData: { status: existing.status } as object,
      afterData: { status: dto.status } as object,
    });

    return { ok: true, handover: updated };
  }

  /** 列出某 DN 的所有 handover 歷史。 */
  async listByDn(user: RequestUser, dnId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx06DnHandover.findMany({
      where: { dnId: dnId.trim(), tenantId },
      orderBy: { suggestedAt: 'desc' },
    });
    return { ok: true, dnId, rows };
  }

  /** 列出當前 driver 待處理（SUGGESTED → 給他）+ 已接（ACCEPTED → 進行中）的 handover。 */
  async listForDriver(user: RequestUser, driverId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx06DnHandover.findMany({
      where: {
        tenantId,
        toDriverId: driverId.trim(),
        status: { in: ['SUGGESTED', 'ACCEPTED'] },
      },
      orderBy: { suggestedAt: 'desc' },
      include: { dn: { select: { id: true, docNo: true, status: true } } },
    });
    return { ok: true, driverId, rows };
  }
}
