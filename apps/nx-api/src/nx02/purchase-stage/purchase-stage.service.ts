// apps/nx-api/src/nx02/purchase-stage/purchase-stage.service.ts
// NX02 PurchaseStage service（國外採購 6 階段流轉）
//
// 對齊：
//   - overview §3.7 國外採購 6 階段（業界改革候選 ⭐⭐）
//   - Crown Q-C3=A strict 順序（推進 1→2→3→4→5→6）
//   - Crown Q-C3-detail=b 任意回退（業務修錯不限範圍、可從 stage 5 直接回 stage 1）
//   - Crown Q-S1=A SmallInt 1~6 enum
//
// 6 階段語意：
//   1 = 備貨中（PO confirmed 後預設、廠商備貨）
//   2 = 要求付款（廠商 email 通知付款）→ 寫 requested_payment_at
//   3 = 待出貨（付款完成、等廠商出貨）→ 寫 paid_at
//   4 = 出貨上船（廠商出貨、配 vesselNo + containerNo）→ 寫 shipped_at
//   5 = 已到港（報關行 email 通知）⭐ 業界 muscle memory → 寫 arrived_at
//   6 = 驗收完成（轉 RR 流程）
//
// 規則：
//   - 推進（target > current）：strict 順序（不可跳階、必須 +1）
//   - 回退（target < current）：任意回退（Crown Q-C3-detail=b、業務修錯）
//   - 同 stage（target = current）：no-op、回 ok
//   - 對應時間欄寫入：推進到 N 才寫；回退不清除歷史時間欄（fact 保留）
//
// guard：
//   - PO 存在 + tenant 一致
//   - PO purchase_type='I'（僅國外採購）
//   - PO 未 voided
//   - PO purchase_stage 非 null（已進入 6 階段流）
//   - targetStage 1~6

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { TransitStageDto } from './dto/purchase-stage.dto';

const STAGE_NAMES: Record<number, string> = {
  1: '備貨中',
  2: '要求付款',
  3: '待出貨',
  4: '出貨上船',
  5: '已到港',
  6: '驗收完成',
};

@Injectable()
export class PurchaseStageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  async transit(user: RequestUser, poId: string, dto: TransitStageDto) {
    const tenantId = requireTenantId(user);
    const targetStage = dto.targetStage;

    const po = await this.prisma.nx02Po.findFirst({
      where: { id: poId, tenantId },
      select: {
        id: true,
        docNo: true,
        purchaseType: true,
        purchaseStage: true,
        voidedAt: true,
        status: true,
        requestedPaymentAt: true,
        paidAt: true,
        shippedAt: true,
        arrivedAt: true,
      },
    });
    if (!po) throw new NotFoundException('PO not found');
    if (po.voidedAt) throw new BadRequestException('PO is voided');
    if (po.purchaseType !== 'I') {
      throw new BadRequestException(
        `Only foreign purchase (purchaseType='I') uses 6-stage tracking, got '${po.purchaseType}'`,
      );
    }
    if (po.purchaseStage === null || po.purchaseStage === undefined) {
      throw new BadRequestException(
        'PO has not entered 6-stage flow (purchase_stage is null); create with purchaseType=I to initialize stage=1',
      );
    }
    const currentStage = po.purchaseStage;

    // same-stage no-op
    if (targetStage === currentStage) {
      return {
        ok: true,
        noop: true,
        currentStage,
        currentStageName: STAGE_NAMES[currentStage],
      };
    }

    // 推進 vs 回退（Crown Q-C3 + Q-C3-detail）
    const isAdvancing = targetStage > currentStage;
    const isRollback = targetStage < currentStage;

    // 推進：strict 順序（必須 +1）
    if (isAdvancing && targetStage !== currentStage + 1) {
      throw new BadRequestException(
        `Cannot skip stages: advance from ${currentStage} (${STAGE_NAMES[currentStage]}) must go to ${currentStage + 1} (${STAGE_NAMES[currentStage + 1]}), not ${targetStage}`,
      );
    }
    // 回退：Crown Q-C3-detail=b 任意回退、不限範圍（業務修錯）

    // 推進時寫對應時間欄（回退時不清除歷史時間欄、fact 保留）
    const data: Prisma.Nx02PoUpdateInput = {
      purchaseStage: targetStage,
      updatedBy: user.sub,
    };
    if (isAdvancing) {
      const now = new Date();
      switch (targetStage) {
        case 2:
          data.requestedPaymentAt = now;
          break;
        case 3:
          data.paidAt = now;
          break;
        case 4:
          data.shippedAt = now;
          break;
        case 5:
          data.arrivedAt = now;
          break;
        // 1 = 初始（create 時已寫）
        // 6 = 驗收完成（已備、後續轉 RR 流程）
        default:
          break;
      }
    }

    const updated = await this.prisma.nx02Po.update({
      where: { id: poId },
      data,
      select: {
        id: true,
        docNo: true,
        purchaseStage: true,
        requestedPaymentAt: true,
        paidAt: true,
        shippedAt: true,
        arrivedAt: true,
      },
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_po',
      entityId: poId,
      entityCode: po.docNo,
      summary: `國外採購 6 階段流轉：${currentStage} ${STAGE_NAMES[currentStage]} → ${targetStage} ${STAGE_NAMES[targetStage]}${isRollback ? '（回退）' : '（推進）'}${dto.note ? ` / ${dto.note}` : ''}`,
      beforeData: po as object,
      afterData: updated as object,
    });

    return {
      ok: true,
      previousStage: currentStage,
      previousStageName: STAGE_NAMES[currentStage],
      currentStage: targetStage,
      currentStageName: STAGE_NAMES[targetStage],
      transitMode: isAdvancing ? 'advance' : 'rollback',
      timestamps: {
        requestedPaymentAt: updated.requestedPaymentAt,
        paidAt: updated.paidAt,
        shippedAt: updated.shippedAt,
        arrivedAt: updated.arrivedAt,
      },
    };
  }
}
