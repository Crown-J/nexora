import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocNx05DocNo, orgCodeFromDocNo } from '../../shared/nx05/nx05-doc-no';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import {
  applyCpPaymentPosted,
  reverseCpPaymentPosted,
} from '../../shared/nx05/nx05-paylog-posting';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { assertPaylogStatusTransition, PaylogStatus } from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePaymentDto, PatchPaymentDto } from './dto/payment.dto';

const PAY_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  payType: true,
  payDate: true,
  partnerId: true,
  arId: true,
  apId: true,
  amount: true,
  currencyId: true,
  payMethod: true,
  noteId: true,
  status: true,
  voidedAt: true,
  postedAt: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05PaylogWhereInput {
    const parts: Prisma.Nx05PaylogWhereInput[] = [{ tenantId, payType: 'CP' }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05Paylog.count({ where }),
      this.prisma.nx05Paylog.findMany({
        where,
        orderBy: [{ payDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: PAY_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Paylog.findFirst({
      where: { id, tenantId, payType: 'CP' },
      select: PAY_SEL,
    });
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePaymentDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const ap = await tx.nx05ApLedger.findFirst({
        where: { id: dto.apId, tenantId },
        select: { docNo: true, supplierId: true, billToPartnerId: true },
      });
      if (!ap) throw new NotFoundException('AP not found');
      const payDate = new Date(dto.payDate);
      await assertFinancePeriodMutable(tx, tenantId, payDate);
      const org = orgCodeFromDocNo(ap.docNo);
      const docNo = await allocNx05DocNo(tx, tenantId, 'CP', org);
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');
      const row = await tx.nx05Paylog.create({
        data: {
          tenantId,
          docNo,
          payType: 'CP',
          payDate,
          // 直送鏈盤點 2026-07-11 補接：AP 有歸戶對象（母公司代付）時、付款對象取歸戶
          partnerId: ap.billToPartnerId ?? ap.supplierId,
          apId: dto.apId,
          amount: new PrismaNs.Decimal(dto.amount),
          currencyId: currId,
          payMethod: dto.payMethod?.trim() || 'CA',
          status: PaylogStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PAY_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_paylog',
        entityId: row.id,
        entityCode: row.docNo,
        summary: '建立廠商付款(草稿)',
        afterData: row as object,
      });
      return row;
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchPaymentDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Paylog.findFirst({
        where: { id, tenantId, payType: 'CP' },
        select: { ...PAY_SEL },
      });
      if (!existing) throw new NotFoundException('Payment not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.payDate));
      if (dto.status === existing.status) return existing;
      assertPaylogStatusTransition(existing.status, dto.status!);
      if (dto.status === PaylogStatus.POSTED) {
        await applyCpPaymentPosted(tx, { tenantId, paylogId: id, userId: user.sub });
      } else if (dto.status === PaylogStatus.VOIDED && existing.status === PaylogStatus.POSTED) {
        await reverseCpPaymentPosted(tx, { tenantId, paylogId: id, userId: user.sub });
      } else if (dto.status === PaylogStatus.VOIDED) {
        await tx.nx05Paylog.update({
          where: { id },
          data: { status: PaylogStatus.VOIDED, voidedAt: new Date(), updatedBy: user.sub },
        });
      }
      const row = await tx.nx05Paylog.findFirst({ where: { id, tenantId }, select: PAY_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_paylog',
        entityId: id,
        entityCode: existing.docNo,
        summary: `付款 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return row!;
    });
  }

  async remove(user: RequestUser, id: string) {
    return this.patch(user, id, { status: PaylogStatus.VOIDED });
  }
}
