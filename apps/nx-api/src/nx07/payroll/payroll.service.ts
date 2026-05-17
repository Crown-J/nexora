import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { createPaylogFromConfirmedSalary } from '../../shared/nx05/nx05-create-paylog-from-salary';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { assertPayrollTransition } from '../../shared/nx07/nx07-state-machine';
import { canViewPayrollSalaryDetail } from '../../shared/nx07/nx07-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreatePayrollDto, PatchPayrollDto } from './payroll.dto';

const HEAD_NO_ITEMS = {
  id: true,
  tenantId: true,
  userId: true,
  yearMonth: true,
  baseSalary: true,
  workDays: true,
  workHours: true,
  otHoursWd: true,
  otHoursHoliday: true,
  otPay: true,
  grossSalary: true,
  deductionTotal: true,
  netSalary: true,
  status: true,
  confirmedAt: true,
  confirmedBy: true,
  paidAt: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ITEM_SEL = {
  id: true,
  salaryRecordId: true,
  componentId: true,
  amount: true,
  calcBasis: true,
  createdAt: true,
} as const;

@Injectable()
export class Nx07PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx07ListQueryDto): Prisma.Nx07SalaryRecordWhereInput {
    const parts: Prisma.Nx07SalaryRecordWhereInput[] = [{ tenantId }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { yearMonth: { contains: s, mode: 'insensitive' } },
          { userId: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx07ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx07SalaryRecord.count({ where }),
      this.prisma.nx07SalaryRecord.findMany({
        where,
        orderBy: [{ yearMonth: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: HEAD_NO_ITEMS,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const detail = canViewPayrollSalaryDetail(user.roles ?? []);
    if (!detail) {
      const row = await this.prisma.nx07SalaryRecord.findFirst({ where: { id, tenantId }, select: HEAD_NO_ITEMS });
      if (!row) throw new NotFoundException('Payroll record not found');
      return { ...row, items: undefined, salaryDetailVisible: false };
    }
    const row = await this.prisma.nx07SalaryRecord.findFirst({
      where: { id, tenantId },
      select: {
        ...HEAD_NO_ITEMS,
        rev_Nx07SalaryRecordItem_salaryRecordId: { orderBy: { id: 'asc' }, select: ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Payroll record not found');
    const { rev_Nx07SalaryRecordItem_salaryRecordId: items, ...rest } = row;
    return { ...rest, items, salaryDetailVisible: true };
  }

  async create(user: RequestUser, dto: CreatePayrollDto) {
    const tenantId = requireTenantId(user);
    const base = new PrismaNs.Decimal(dto.baseSalary ?? 0);
    const row = await this.prisma.nx07SalaryRecord.create({
      data: {
        tenantId,
        userId: dto.userId.trim(),
        yearMonth: dto.yearMonth.trim(),
        baseSalary: base,
        status: 'DRAFT',
      },
      select: HEAD_NO_ITEMS,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'CREATE',
      entityTable: 'nx07_salary_record',
      entityId: row.id,
      entityCode: `${row.yearMonth}/${row.userId}`,
      summary: '建立薪資紀錄',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchPayrollDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07SalaryRecord.findFirst({ where: { id, tenantId }, select: HEAD_NO_ITEMS });
    if (!existing) throw new NotFoundException('Payroll record not found');
    const next = dto.status.trim();
    assertPayrollTransition(existing.status, next);
    const row = await this.prisma.nx07SalaryRecord.update({
      where: { id },
      data: {
        status: next,
        ...(next === 'CONFIRMED' ? { confirmedBy: user.sub, confirmedAt: new Date() } : {}),
        ...(next === 'PAID' ? { paidAt: new Date() } : {}),
      },
      select: HEAD_NO_ITEMS,
    });
    // NX07-IMPL-01 Phase 4：CONFIRMED 時自動建 NX05 Paylog DRAFT（業務閉環完整化 ⭐⭐⭐）
    let paylogId: string | null = null;
    if (next === 'CONFIRMED') {
      try {
        paylogId = await createPaylogFromConfirmedSalary(this.prisma, {
          tenantId,
          salaryRecordId: id,
          userId: user.sub,
        });
      } catch (e) {
        // helper 失敗不阻擋薪資 CONFIRMED（plan §7 風險 mitigation）
        // 揭露：audit log 記錄、不 throw
        await this.audit.write({
          tenantId,
          actorUserId: user.sub,
          moduleCode: 'NX07',
          action: 'UPDATE',
          entityTable: 'nx07_salary_record',
          entityId: id,
          summary: `Paylog wire 失敗（薪資 CONFIRMED 成功、但 Paylog 建立失敗、HR 需手動補建）: ${(e as Error).message}`,
        });
      }
    }
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_salary_record',
      entityId: id,
      entityCode: `${existing.yearMonth}/${existing.userId}`,
      summary: `薪資狀態 ${existing.status} -> ${next}${paylogId ? `（自動建 Paylog ${paylogId}）` : ''}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07SalaryRecord.findFirst({ where: { id, tenantId }, select: HEAD_NO_ITEMS });
    if (!existing) throw new NotFoundException('Payroll record not found');
    if (existing.status === 'PAID') throw new BadRequestException('Cannot void PAID payroll');
    const row = await this.prisma.nx07SalaryRecord.update({
      where: { id },
      data: { status: 'VOIDED' },
      select: HEAD_NO_ITEMS,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_salary_record',
      entityId: id,
      entityCode: `${existing.yearMonth}/${existing.userId}`,
      summary: '作廢薪資',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
