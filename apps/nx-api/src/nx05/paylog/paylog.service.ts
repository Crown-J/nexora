// apps/nx-api/src/nx05/paylog/paylog.service.ts
// v1.2 階段 F P5 B：paylog + 一對多 settlement 共用 service

import { Injectable } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { applySettlementsForPaylog } from '../../shared/nx05/nx05-apply-settlements';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import {
  CreatePaylogWithSettlementsDto,
  payMethodToDbCode,
} from './dto/paylog.dto';

@Injectable()
export class PaylogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /**
   * 建立收/付款 paylog + 多筆 settlement、自動沖對應 AR/AP。
   *
   * payType 對映：
   *   - 收款（R）→ CR=客戶收款
   *   - 付款（P）→ CP=廠商付款
   *
   * payMethod 對映 nx05_paylog.pay_method 既有代號（CA/TT/CK/CR）。
   */
  async createWithSettlements(user: RequestUser, dto: CreatePaylogWithSettlementsDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // docNo 用 RC（收款）/ CP（付款）kind、allocDocNo 內部映射為 'PY-' 前綴
      const docKind = dto.noteType === 'R' ? 'RC' : 'CP';
      const docNo = await allocNx05DocNo(tx, tenantId, docKind, 'HQ0');
      const payType = dto.noteType === 'R' ? 'CR' : 'CP';
      const payMethod = payMethodToDbCode(dto.paymentMethod);

      // 既有 nx05_paylog 有單一 arId/apId（一對一 schema）、本軌一對多走 settlement 表
      // → 為兼容既有查詢、若 settlement 只 1 筆、把該 AR/AP id 寫入既有欄；多筆則留 null
      const first = dto.settlements[0]!;
      const singleArId =
        dto.settlements.length === 1 && first.arId ? first.arId : null;
      const singleApId =
        dto.settlements.length === 1 && first.apId ? first.apId : null;

      const paylog = await tx.nx05Paylog.create({
        data: {
          tenantId,
          docNo,
          payType,
          payDate: new Date(dto.noteDate),
          partnerId: dto.partnerId,
          arId: singleArId,
          apId: singleApId,
          amount: new PrismaNs.Decimal(dto.amount),
          currencyId: 'TWD',
          payMethod,
          status: 'POSTED',
          postedAt: new Date(),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true, docNo: true },
      });

      const settledCount = await applySettlementsForPaylog(tx, {
        tenantId,
        paylogId: paylog.id,
        userId: user.sub,
        settlements: dto.settlements.map((s) => ({
          arId: s.arId ?? null,
          apId: s.apId ?? null,
          settledAmount: s.settledAmount,
          remark: s.remark ?? null,
        })),
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_paylog',
        entityId: paylog.id,
        entityCode: paylog.docNo,
        summary: `${dto.noteType === 'R' ? '收款' : '付款'} ${dto.amount} 沖 ${settledCount} 筆`,
      });

      return { paylogId: paylog.id, docNo: paylog.docNo, settlements: settledCount };
    });
  }
}
