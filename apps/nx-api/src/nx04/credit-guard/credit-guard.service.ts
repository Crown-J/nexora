// apps/nx-api/src/nx04/credit-guard/credit-guard.service.ts
// NX04 CreditGuard service（客戶授信擋單 4 機制）
//
// 對齊：
//   - overview §4 客戶授信業務範式（Crown Q7 4 項都做）
//   - Crown Q3 逾期 15 天自動轉現金（tenant.creditOverdueDaysThreshold 讀取）
//   - Crown Q-C4=A 執行順序：黑名單 → 額度 → 逾期 → 付款條件
//   - Crown Q-S2=a tenant 層級閾值
//
// 4 機制 guard：
//   1. 黑名單 check：partner.creditStatus = 'F' (frozen) → 直接擋（throw）
//   2. 額度超額 check：SUM(未付 AR.balanceAmount) + soAmount > partner.creditLimit → 擋（throw）
//   3. 逾期 check：existing AR overdueDays > tenant.creditOverdueDaysThreshold → 轉現金（adjustedPaymentTerm='CASH'、不擋）
//   4. 付款條件 check：純返回 partner.paymentTermDomestic（不擋、純帶入）
//
// 業務語意：
//   - CreditGuardService 不寫 DB、純 query + decision
//   - so.service create 時呼叫、return 結果決定 SO paymentTerm 與是否阻擋

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CheckCreditDto } from './dto/credit-guard.dto';

export type CreditCheckResult = {
  passed: boolean;
  adjustedPaymentTerm: string;
  overdueTransferToCash: boolean;
  details: {
    creditStatus: string;
    creditLimit: string;
    usedAmount: string;
    availableAmount: string;
    overdueDays: number;
    overdueThreshold: number;
    blockedReason: string | null;
  };
};

@Injectable()
export class CreditGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async check(user: RequestUser, dto: CheckCreditDto): Promise<CreditCheckResult> {
    const tenantId = requireTenantId(user);
    const customerId = dto.customerId.trim();
    const soAmount = new PrismaNs.Decimal(dto.soAmount);

    // load customer + tenant 參數
    const customer = await this.prisma.nx01Partner.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        partnerType: true,
        creditLimit: true,
        creditStatus: true,
        paymentTermDomestic: true,
        isActive: true,
      },
    });
    if (!customer) throw new NotFoundException('customerId not found in tenant');
    if (customer.partnerType !== 'C' && customer.partnerType !== 'O') {
      throw new BadRequestException(
        `customerId must be partner_type IN ('C', 'O') (保養廠或同行), got '${customer.partnerType}'`,
      );
    }
    if (!customer.isActive) {
      throw new BadRequestException('customerId is inactive');
    }

    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { creditOverdueDaysThreshold: true },
    });
    const overdueThreshold = tenant?.creditOverdueDaysThreshold ?? 15;

    // ============================================================
    // 機制 1：黑名單 check（Crown Q-C4=A 第一順位、最嚴）
    // creditStatus: N=正常 / W=僅收現金 / F=凍結（黑名單）
    // ============================================================
    if (customer.creditStatus === 'F') {
      throw new ForbiddenException(
        `Customer ${customer.code} (${customer.name}) is FROZEN (creditStatus='F'); cannot create SO`,
      );
    }

    // ============================================================
    // 機制 2：額度超額 check（Crown Q-C4=A 第二順位）
    // SUM(未付 AR.balanceAmount) + soAmount > creditLimit → 擋
    // creditLimit=0 視為「無限制」（schema 註解既有設計）
    // ============================================================
    const unpaidArSum = await this.prisma.nx05ArLedger.aggregate({
      where: {
        tenantId,
        customerId,
        status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { balanceAmount: true },
    });
    const usedAmount = new PrismaNs.Decimal(unpaidArSum._sum.balanceAmount ?? 0);
    const projectedAmount = usedAmount.add(soAmount);
    const creditLimit = new PrismaNs.Decimal(customer.creditLimit ?? 0);
    const isUnlimited = creditLimit.eq(0); // creditLimit=0 → 無限制
    const availableAmount = isUnlimited ? null : creditLimit.sub(usedAmount);

    if (!isUnlimited && projectedAmount.gt(creditLimit)) {
      throw new ForbiddenException(
        `Customer ${customer.code} credit limit exceeded: used ${usedAmount.toString()} + so ${soAmount.toString()} = ${projectedAmount.toString()} > limit ${creditLimit.toString()}`,
      );
    }

    // ============================================================
    // 機制 3：逾期 check（Crown Q-C4=A 第三順位、不擋、轉現金）
    // existing AR overdueDays > tenant.creditOverdueDaysThreshold → 自動轉現金
    // 業界半月 standard（預設 15、用戶可調）
    // ============================================================
    const overdueAr = await this.prisma.nx05ArLedger.findFirst({
      where: {
        tenantId,
        customerId,
        status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
        overdueDays: { gt: overdueThreshold },
      },
      select: { overdueDays: true },
      orderBy: { overdueDays: 'desc' },
    });
    const overdueDays = overdueAr?.overdueDays ?? 0;
    const overdueTransferToCash = overdueDays > overdueThreshold;

    // ============================================================
    // 機制 4：付款條件 check（Crown Q-C4=A 第四順位、純帶入）
    // 逾期觸發 → 強制 'CASH'
    // 否則 → 用 dto.paymentTerm or partner.paymentTermDomestic
    // ============================================================
    const adjustedPaymentTerm = overdueTransferToCash
      ? 'CASH'
      : (dto.paymentTerm?.trim() || customer.paymentTermDomestic || 'NET30');

    return {
      passed: true,
      adjustedPaymentTerm,
      overdueTransferToCash,
      details: {
        creditStatus: customer.creditStatus,
        creditLimit: creditLimit.toString(),
        usedAmount: usedAmount.toString(),
        availableAmount: availableAmount?.toString() ?? 'UNLIMITED',
        overdueDays,
        overdueThreshold,
        blockedReason: null,
      },
    };
  }
}
