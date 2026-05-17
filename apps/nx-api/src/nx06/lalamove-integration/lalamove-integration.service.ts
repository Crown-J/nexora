// apps/nx-api/src/nx06/lalamove-integration/lalamove-integration.service.ts
// NX06 LalamoveIntegration service（Lalamove API 半自動整合、service shell）
//
// 對齊：
//   - overview §3.1 #9 Lalamove API 半自動整合（業界改革 ⭐⭐）
//   - Crown Q6=b 拍板 Lalamove 有 API
//   - Q-RHYTHM-2 D3 設計決策：純 service shell + 環境變數可關
//
// 業務語意：
//   - createOrder：建 Lalamove 訂單（生成 mock orderId or 實際 HTTP call）
//   - handleWebhook：接收 Lalamove webhook、更新 lalamove_callback_status
//   - LALAMOVE_API_ENABLED 環境變數控制 mock vs real（避免本軌依賴公網 webhook endpoint）
//
// 本軌邊界：
//   - 純 service shell：實際 Lalamove HTTP call 留環境變數可關
//   - webhook endpoint 落地、但實際 Lalamove dashboard webhook 配置屬 DevOps 軌
//   - 後續軌：設定環境變數 + Lalamove 商家 API key + 公網 webhook endpoint 後啟動

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateLalamoveOrderDto, LalamoveWebhookDto } from './dto/lalamove-integration.dto';

@Injectable()
export class LalamoveIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  /** 是否啟用實際 Lalamove API call（環境變數控制、預設 false = mock 模式）。 */
  private get apiEnabled(): boolean {
    return process.env.LALAMOVE_API_ENABLED === 'true';
  }

  /**
   * 建 Lalamove 訂單（半自動：倉管組長發起、系統 → Lalamove API）
   *   - mock 模式：生成假 orderId / trackingNo、callback_status='PENDING'
   *   - real 模式：實際 HTTP call Lalamove API（後續軌啟動）
   */
  async createOrder(user: RequestUser, dnId: string, dto: CreateLalamoveOrderDto) {
    const tenantId = requireTenantId(user);

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { id: dnId, tenantId },
      select: {
        id: true,
        docNo: true,
        status: true,
        logisticsType: true,
        lalamoveOrderId: true,
      },
    });
    if (!dn) throw new NotFoundException('DN not found');
    if (dn.lalamoveOrderId) {
      throw new BadRequestException(
        `DN ${dn.docNo} already has Lalamove order ${dn.lalamoveOrderId}`,
      );
    }

    // mock vs real
    const orderId = this.apiEnabled
      ? await this.callLalamoveCreateApi(dnId, dto)
      : `MOCK-LALAMOVE-${Date.now()}`;
    const trackingNo = this.apiEnabled ? `TRACK-${orderId}` : `MOCK-TRACK-${Date.now()}`;

    const updated = await this.prisma.nx06Dn.update({
      where: { id: dnId },
      data: {
        lalamoveOrderId: orderId,
        lalamoveTrackingNo: trackingNo,
        lalamoveCallbackStatus: 'PENDING',
        updatedBy: user.sub,
      },
      select: {
        id: true,
        docNo: true,
        lalamoveOrderId: true,
        lalamoveTrackingNo: true,
        lalamoveCallbackStatus: true,
      },
    });

    return {
      ok: true,
      mode: this.apiEnabled ? 'real' : 'mock',
      dn: updated,
      driverNote: dto.driverNote ?? null,
    };
  }

  /**
   * Lalamove webhook handler（更新 callback_status + 配送費用）
   *   - PICKED_UP / COMPLETED / CANCELLED 階段更新
   *   - COMPLETED 時若 actualFee 提供、寫 internal_cost 到對應 DnItem
   */
  async handleWebhook(user: RequestUser, dto: LalamoveWebhookDto) {
    const tenantId = requireTenantId(user);

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { tenantId, lalamoveOrderId: dto.lalamoveOrderId.trim() },
      select: { id: true, docNo: true, lalamoveCallbackStatus: true },
    });
    if (!dn) throw new NotFoundException('DN not found for given lalamoveOrderId');

    await this.prisma.nx06Dn.update({
      where: { id: dn.id },
      data: {
        lalamoveCallbackStatus: dto.callbackStatus,
        ...(dto.trackingNo?.trim() ? { lalamoveTrackingNo: dto.trackingNo.trim() } : {}),
        ...(dto.callbackStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
        updatedBy: user.sub,
      },
    });

    // COMPLETED + actualFee 提供 → 寫 DnItem.internalCost（攤分到 items、簡化：寫第一筆 item）
    if (dto.callbackStatus === 'COMPLETED' && dto.actualFee?.trim()) {
      const firstItem = await this.prisma.nx06DnItem.findFirst({
        where: { dnId: dn.id },
        select: { id: true },
        orderBy: { lineNo: 'asc' },
      });
      if (firstItem) {
        await this.prisma.nx06DnItem.update({
          where: { id: firstItem.id },
          data: { internalCost: new PrismaNs.Decimal(dto.actualFee.trim()) },
        });
      }
    }

    return { ok: true, dnId: dn.id, docNo: dn.docNo, newStatus: dto.callbackStatus };
  }

  /** 實際 Lalamove API call（後續軌啟動、本軌 placeholder）。 */
  private async callLalamoveCreateApi(_dnId: string, _dto: CreateLalamoveOrderDto): Promise<string> {
    throw new Error(
      'Lalamove real API not implemented yet (set LALAMOVE_API_ENABLED=false for mock mode)',
    );
  }
}
