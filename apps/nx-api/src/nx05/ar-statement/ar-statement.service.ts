// apps/nx-api/src/nx05/ar-statement/ar-statement.service.ts
// NX05 ArStatement service（AR 月底自動對帳單）
//
// 對齊：
//   - overview §6.3 ⭐ AR 月底自動對帳單（Crown Q3 + Q7=a 每月 1 號 cron）
//   - 業界 muscle memory：月結客戶必備、業務員不用手動產
//   - 對齊 NX02 rfq.exportRfq 範式（text + payload 雙格式）
//
// 業務語意：
//   - input: customerId / year / month
//   - logic: query 本月 AR + 本月 Paylog → summary + line items
//   - output: { text, payload } 採購員 / 業務助理可 copy 寄客戶
//
// cron 設計：
//   - 本軌純 endpoint（業務員 / 外部 cron 觸發）
//   - cron decorator 註冊留 backlog（對齊 AR M1 範式）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { ArStatementQueryDto } from './dto/ar-statement.dto';

@Injectable()
export class ArStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatement(user: RequestUser, customerId: string, q: ArStatementQueryDto) {
    const tenantId = requireTenantId(user);
    const cid = customerId.trim();
    if (!cid) throw new BadRequestException('customerId is required');

    // period: 本月 1 號 ~ 下月 1 號
    const startDate = new Date(q.year, q.month - 1, 1);
    const endDate = new Date(q.year, q.month, 1);

    // load customer
    const customer = await this.prisma.nx01Partner.findFirst({
      where: { id: cid, tenantId },
      select: { id: true, code: true, name: true, partnerType: true, paymentTermDomestic: true },
    });
    if (!customer) throw new NotFoundException('customerId not found');
    if (customer.partnerType !== 'C' && customer.partnerType !== 'O') {
      throw new BadRequestException(
        `customerId must be partner_type IN ('C', 'O') (保養廠或同行), got '${customer.partnerType}'`,
      );
    }

    // ============================================================
    // 本期 AR（arDate in period）
    // ============================================================
    const arRows = await this.prisma.nx05ArLedger.findMany({
      where: {
        tenantId,
        customerId: cid,
        arDate: { gte: startDate, lt: endDate },
      },
      select: {
        id: true,
        docNo: true,
        soId: true,
        arDate: true,
        dueDate: true,
        originalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        overdueDays: true,
      },
      orderBy: { arDate: 'asc' },
    });

    const totalNewAr = arRows.reduce(
      (acc, r) => acc.add(new PrismaNs.Decimal(r.originalAmount)),
      new PrismaNs.Decimal(0),
    );

    // ============================================================
    // 本期 Paylog（payDate in period、arId 對應本客戶）
    // ============================================================
    const paylogRows = await this.prisma.nx05Paylog.findMany({
      where: {
        tenantId,
        partnerId: cid,
        payDate: { gte: startDate, lt: endDate },
        payType: { in: ['CR', 'RC'] }, // CR 收款 / RC 客戶退款
        status: 'POSTED',
      },
      select: {
        id: true,
        docNo: true,
        arId: true,
        payDate: true,
        amount: true,
        payType: true,
        payMethod: true,
        remark: true,
      },
      orderBy: { payDate: 'asc' },
    });

    const totalReceived = paylogRows
      .filter((p) => p.payType === 'CR')
      .reduce((acc, r) => acc.add(new PrismaNs.Decimal(r.amount)), new PrismaNs.Decimal(0));
    const totalRefunded = paylogRows
      .filter((p) => p.payType === 'RC')
      .reduce((acc, r) => acc.add(new PrismaNs.Decimal(r.amount)), new PrismaNs.Decimal(0));

    // ============================================================
    // 期末未收餘額（query 月底前所有未付 AR 累計）
    // ============================================================
    const endingOpenArAgg = await this.prisma.nx05ArLedger.aggregate({
      where: {
        tenantId,
        customerId: cid,
        arDate: { lt: endDate },
        status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { balanceAmount: true },
    });
    const endingBalance = new PrismaNs.Decimal(endingOpenArAgg._sum.balanceAmount ?? 0);

    // ============================================================
    // 結構化 payload + text format
    // ============================================================
    const payload = {
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        paymentTerm: customer.paymentTermDomestic,
      },
      period: { year: q.year, month: q.month, startDate, endDate },
      summary: {
        totalNewAr: totalNewAr.toString(),
        totalReceived: totalReceived.toString(),
        totalRefunded: totalRefunded.toString(),
        netReceived: totalReceived.sub(totalRefunded).toString(),
        endingBalance: endingBalance.toString(),
        newArCount: arRows.length,
        paylogCount: paylogRows.length,
      },
      arItems: arRows.map((r) => ({
        docNo: r.docNo,
        arDate: r.arDate,
        dueDate: r.dueDate,
        originalAmount: r.originalAmount.toString(),
        paidAmount: r.paidAmount.toString(),
        balanceAmount: r.balanceAmount.toString(),
        status: r.status,
        overdueDays: r.overdueDays,
      })),
      paylogItems: paylogRows.map((p) => ({
        docNo: p.docNo,
        payDate: p.payDate,
        amount: p.amount.toString(),
        payType: p.payType,
        payMethod: p.payMethod,
      })),
    };

    // text format（業界 muscle memory：對帳單寄客戶範式）
    const lines: string[] = [];
    lines.push(`對帳單 ${q.year} 年 ${q.month} 月`);
    lines.push(`客戶：${customer.name} (${customer.code})`);
    lines.push(`付款條件：${customer.paymentTermDomestic ?? 'NET30'}`);
    lines.push('');
    lines.push('───────────────────────────────────────');
    lines.push(`本期新增銷貨：${arRows.length} 筆、總額 ${totalNewAr.toString()}`);
    lines.push(`本期收款　　：${paylogRows.filter((p) => p.payType === 'CR').length} 筆、總額 ${totalReceived.toString()}`);
    if (totalRefunded.gt(0)) {
      lines.push(`本期退款　　：總額 ${totalRefunded.toString()}`);
    }
    lines.push(`期末未收餘額：${endingBalance.toString()}`);
    lines.push('───────────────────────────────────────');
    lines.push('');
    if (arRows.length > 0) {
      lines.push('明細（本期銷貨）：');
      for (const r of arRows) {
        const due = r.dueDate.toISOString().slice(0, 10);
        const overdueLabel = r.overdueDays > 0 ? `  ⚠️ 逾期 ${r.overdueDays} 天` : '';
        lines.push(`  ${r.docNo}  日期 ${r.arDate.toISOString().slice(0, 10)}  到期 ${due}`);
        lines.push(`    應收 ${r.originalAmount.toString()} / 已收 ${r.paidAmount.toString()} / 未收 ${r.balanceAmount.toString()}  狀態 ${r.status}${overdueLabel}`);
      }
      lines.push('');
    }
    if (paylogRows.length > 0) {
      lines.push('收款紀錄：');
      for (const p of paylogRows) {
        lines.push(`  ${p.docNo}  日期 ${p.payDate.toISOString().slice(0, 10)}  ${p.payType === 'CR' ? '收款' : '退款'} ${p.amount.toString()}  方式 ${p.payMethod}`);
      }
      lines.push('');
    }
    lines.push('───────────────────────────────────────');
    lines.push(`請於到期日前完成付款、謝謝。`);

    return {
      text: lines.join('\n'),
      payload,
    };
  }
}
