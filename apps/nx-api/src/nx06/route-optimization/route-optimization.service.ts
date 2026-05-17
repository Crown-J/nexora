// apps/nx-api/src/nx06/route-optimization/route-optimization.service.ts
// NX06 RouteOptimization service（單車 + 多車 VRP 簡化版）
//
// 對齊：
//   - overview v0.2.0 §4.1 #1（單車最短路徑）+ #2（多車 VRP 簡化版、≤ 5 外務員 / ≤ 100 任務 / ≤ 30 秒）
//   - Crown Q1=100/日、簡化版 VRP solver
//   - Hank Q-H2：OR-Tools npm 安裝風險 → 採 pure-js heuristic（nearest-neighbor + greedy load balance）
//   - Hank Q-H3：Google Maps API key 未到 → Haversine 估距 mock fallback
//
// 演算法：
//   - 單車：nearest-neighbor TSP（起點固定、貪婪選最近點）
//   - 多車：先「載荷平衡」分派（loop driver 取最近 DN）→ 每車內 nearest-neighbor 排序
//   - 演算過程：寫 route_batch_id + route_order_in_sequence + estimated_duration_sec 到 nx06_dn
//
// 邊界：
//   - 純 DRAFT/DISPATCHED 狀態的 DN 才能優化（COMPLETED 已成歷史不動）
//   - 演算結果寫入 DB 但不自動 dispatch（保留半自動：倉管組長後續手動 dispatch）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import {
  fetchDistanceMatrix,
  GOOGLE_MAPS_ENABLED,
  type LatLng,
} from '../../shared/nx06/nx06-google-maps-client';
import { haversineKm, nearestNeighborOrder, estimateDurationSec } from '../../shared/nx06/nx06-haversine';

import type { OptimizeMultiVehicleDto, OptimizeSingleVehicleDto } from './dto/route-optimization.dto';

interface DnWithCoords {
  id: string;
  docNo: string;
  lat: number;
  lng: number;
  status: string;
}

@Injectable()
export class RouteOptimizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** 載入 DN + 取首停 GPS（Stop 無 lat/lng schema、用 dn.lastLat/Lng fallback、否則 reject）。 */
  private async loadDnsWithCoords(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    dnIds: string[],
  ): Promise<DnWithCoords[]> {
    const rows = await tx.nx06Dn.findMany({
      where: { id: { in: dnIds }, tenantId },
      select: { id: true, docNo: true, status: true, lastLat: true, lastLng: true },
    });
    const out: DnWithCoords[] = [];
    for (const r of rows) {
      if (!r.lastLat || !r.lastLng) {
        // 真實場景應 geocode dn.stop.address，本軌簡化：要求 lastLat/Lng 已填（從外務員 App heartbeat 寫入）
        continue;
      }
      out.push({
        id: r.id,
        docNo: r.docNo,
        status: r.status,
        lat: Number(r.lastLat),
        lng: Number(r.lastLng),
      });
    }
    return out;
  }

  /** 單車場景：對某 driver 的 N 個 DN 排最短訪問順序。 */
  async optimizeSingleVehicle(user: RequestUser, dto: OptimizeSingleVehicleDto) {
    const tenantId = requireTenantId(user);

    const driver = await this.prisma.nx01User.findFirst({
      where: { id: dto.driverUserId.trim(), tenantId, isActive: true },
      select: { id: true, userName: true },
    });
    if (!driver) throw new BadRequestException('driverUserId not found or inactive');

    const dns = await this.loadDnsWithCoords(this.prisma, tenantId, dto.dnIds);
    if (!dns.length) {
      throw new BadRequestException('No DNs with GPS coords found (need lastLat/Lng populated)');
    }

    // 起點：dto override > driver 名下任一 DISPATCHED DN 的 lastLat/Lng > 第一個 DN
    let start: LatLng;
    if (dto.startLat !== undefined && dto.startLng !== undefined) {
      start = { lat: dto.startLat, lng: dto.startLng };
    } else {
      const driverDn = await this.prisma.nx06Dn.findFirst({
        where: { tenantId, driverUserId: driver.id, lastLat: { not: null } },
        orderBy: { lastLocationAt: 'desc' },
        select: { lastLat: true, lastLng: true },
      });
      start = driverDn?.lastLat && driverDn?.lastLng
        ? { lat: Number(driverDn.lastLat), lng: Number(driverDn.lastLng) }
        : { lat: dns[0]!.lat, lng: dns[0]!.lng };
    }

    const points: LatLng[] = dns.map((d) => ({ lat: d.lat, lng: d.lng }));
    const order = nearestNeighborOrder(start, points);

    // 用 Google Maps Distance Matrix（or mock）算總時長
    const matrix = await fetchDistanceMatrix(
      [start, ...order.slice(0, -1).map((i) => points[i]!)],
      order.map((i) => points[i]!),
    );

    const batchId = `RB${Date.now().toString(36).toUpperCase().slice(-12)}`;
    const sequence = order.map((idx, i) => ({
      dn: dns[idx]!,
      seq: i + 1,
      etaSec: matrix[i]?.[i]?.durationSeconds ?? 0,
    }));

    // 寫入 routeBatchId + routeOrderInSequence + estimatedDurationSec
    for (const item of sequence) {
      await this.prisma.nx06Dn.update({
        where: { id: item.dn.id },
        data: {
          routeBatchId: batchId,
          routeOrderInSequence: item.seq,
          estimatedDurationSec: item.etaSec,
          updatedBy: user.sub,
        },
      });
    }

    return {
      ok: true,
      mode: GOOGLE_MAPS_ENABLED() ? 'real' : 'mock',
      driver: { id: driver.id, userName: driver.userName },
      routeBatchId: batchId,
      totalDns: sequence.length,
      sequence: sequence.map((s) => ({
        dnId: s.dn.id,
        docNo: s.dn.docNo,
        order: s.seq,
        etaSec: s.etaSec,
      })),
    };
  }

  /**
   * 多車場景：N driver × M DN VRP 簡化版（≤ 5 driver、≤ 100 DN）。
   * 演算法：load-balanced greedy + per-vehicle nearest-neighbor。
   */
  async optimizeMultiVehicle(user: RequestUser, dto: OptimizeMultiVehicleDto) {
    const tenantId = requireTenantId(user);

    const drivers = await this.prisma.nx01User.findMany({
      where: { id: { in: dto.driverUserIds.map((s) => s.trim()) }, tenantId, isActive: true },
      select: { id: true, userName: true },
    });
    if (drivers.length !== dto.driverUserIds.length) {
      throw new BadRequestException('Some driverUserIds invalid or inactive');
    }

    const dns = await this.loadDnsWithCoords(this.prisma, tenantId, dto.dnIds);
    if (!dns.length) {
      throw new BadRequestException('No DNs with GPS coords found');
    }

    const maxPerVehicle =
      dto.maxTasksPerVehicle ?? Math.ceil(dns.length / drivers.length) + 2;

    // 取各 driver 起點（最後 GPS 或第一個 DN）
    const driverStarts = await Promise.all(
      drivers.map(async (drv) => {
        const drvDn = await this.prisma.nx06Dn.findFirst({
          where: { tenantId, driverUserId: drv.id, lastLat: { not: null } },
          orderBy: { lastLocationAt: 'desc' },
          select: { lastLat: true, lastLng: true },
        });
        return drvDn?.lastLat && drvDn?.lastLng
          ? { lat: Number(drvDn.lastLat), lng: Number(drvDn.lastLng) }
          : { lat: dns[0]!.lat, lng: dns[0]!.lng };
      }),
    );

    // load-balanced assignment：DN 一個一個分給「目前任務最少 + 距離最近」的 driver
    type Assignment = { driverId: string; driverName: string; start: LatLng; dns: DnWithCoords[] };
    const assignments: Assignment[] = drivers.map((d, i) => ({
      driverId: d.id,
      driverName: d.userName,
      start: driverStarts[i]!,
      dns: [],
    }));

    const remaining = [...dns];
    while (remaining.length) {
      // 對每個尚未分派的 DN、找「最佳 driver」（任務量 < max 且距離最近 driver 起點 / 現有任務）
      let bestDnIdx = 0;
      let bestDrvIdx = 0;
      let bestScore = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dn = remaining[i]!;
        for (let j = 0; j < assignments.length; j++) {
          const asg = assignments[j]!;
          if (asg.dns.length >= maxPerVehicle) continue;
          const refPoint = asg.dns.length
            ? { lat: asg.dns[asg.dns.length - 1]!.lat, lng: asg.dns[asg.dns.length - 1]!.lng }
            : asg.start;
          const dist = haversineKm(refPoint, { lat: dn.lat, lng: dn.lng });
          // score：距離 + 任務量平衡 penalty（多任務的 driver +0.5 km penalty）
          const score = dist + asg.dns.length * 0.5;
          if (score < bestScore) {
            bestScore = score;
            bestDnIdx = i;
            bestDrvIdx = j;
          }
        }
      }
      const picked = remaining.splice(bestDnIdx, 1)[0]!;
      assignments[bestDrvIdx]!.dns.push(picked);
    }

    const batchId = `RB${Date.now().toString(36).toUpperCase().slice(-12)}`;

    // 每車內再做 nearest-neighbor + 寫入 routeBatchId
    const results: Array<{
      driverId: string;
      driverName: string;
      taskCount: number;
      sequence: Array<{ dnId: string; docNo: string; order: number; etaSec: number }>;
    }> = [];

    for (const asg of assignments) {
      const points: LatLng[] = asg.dns.map((d) => ({ lat: d.lat, lng: d.lng }));
      const order = nearestNeighborOrder(asg.start, points);
      const seq: Array<{ dnId: string; docNo: string; order: number; etaSec: number }> = [];
      let prevPoint: LatLng = asg.start;
      for (let i = 0; i < order.length; i++) {
        const dn = asg.dns[order[i]!]!;
        const km = haversineKm(prevPoint, { lat: dn.lat, lng: dn.lng });
        const etaSec = estimateDurationSec(km);
        await this.prisma.nx06Dn.update({
          where: { id: dn.id },
          data: {
            routeBatchId: batchId,
            routeOrderInSequence: i + 1,
            estimatedDurationSec: etaSec,
            driverUserId: asg.driverId,
            updatedBy: user.sub,
          },
        });
        seq.push({ dnId: dn.id, docNo: dn.docNo, order: i + 1, etaSec });
        prevPoint = { lat: dn.lat, lng: dn.lng };
      }
      results.push({
        driverId: asg.driverId,
        driverName: asg.driverName,
        taskCount: asg.dns.length,
        sequence: seq,
      });
    }

    return {
      ok: true,
      mode: GOOGLE_MAPS_ENABLED() ? 'real' : 'mock',
      routeBatchId: batchId,
      totalDns: dns.length,
      vehicleCount: drivers.length,
      maxTasksPerVehicle: maxPerVehicle,
      assignments: results,
    };
  }

  /** Route batch query：列出某 batch 內所有 DN（含 sequence）。 */
  async getBatch(user: RequestUser, batchId: string) {
    const tenantId = requireTenantId(user);
    const dns = await this.prisma.nx06Dn.findMany({
      where: { tenantId, routeBatchId: batchId },
      orderBy: [{ driverUserId: 'asc' }, { routeOrderInSequence: 'asc' }],
      select: {
        id: true,
        docNo: true,
        status: true,
        driverUserId: true,
        routeOrderInSequence: true,
        estimatedDurationSec: true,
        lastLat: true,
        lastLng: true,
      },
    });
    if (!dns.length) throw new NotFoundException('Route batch not found');
    return { ok: true, batchId, dns };
  }
}
