// apps/nx-api/src/nx02/demand/demand.service.ts
// v1.2 階段 I P3：採購需求手動新增 + 操作 service

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateDemandDto, IgnoreDemandDto, ListDemandQueryDto } from './dto/demand.dto';

const DEMAND_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  demandType: true,
  partId: true,
  warehouseId: true,
  qty: true,
  customerId: true,
  expectedDate: true,
  status: true,
  ignoreReason: true,
  refRfqId: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  part: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  customer: { select: { code: true, name: true } },
} as const;

@Injectable()
export class DemandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private async allocDocNo(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `DR-${yyyymm}-`;
    const last = await tx.nx02Demand.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
    let next = 1;
    if (last?.docNo) {
      const tail = last.docNo.split('-').pop();
      const n = parseInt(tail ?? '', 10);
      if (!Number.isNaN(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  async list(user: RequestUser, q: ListDemandQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.Nx02DemandWhereInput = { tenantId };
    if (q.demandType) where.demandType = q.demandType;
    if (q.status) where.status = q.status;
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx02Demand.count({ where }),
      this.prisma.nx02Demand.findMany({
        where,
        orderBy: [
          { demandType: 'desc' }, // O 客訂排前
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: DEMAND_SEL,
      }),
    ]);

    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Demand.findFirst({
      where: { id, tenantId },
      select: DEMAND_SEL,
    });
    if (!row) throw new NotFoundException('Demand not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateDemandDto) {
    const tenantId = requireTenantId(user);
    const demandType = dto.demandType ?? 'O';

    // schema 約束：demandType='O' 時 customerId 必填
    if (demandType === 'O' && !dto.customerId?.trim()) {
      throw new BadRequestException('demandType=O 客訂時、customerId 必填');
    }

    // validate part/warehouse 存在
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: dto.partId.trim(), tenantId },
      select: { id: true },
    });
    if (!part) throw new NotFoundException(`partId ${dto.partId} not found`);

    const wh = await this.prisma.nx01Warehouse.findFirst({
      where: { id: dto.warehouseId.trim(), tenantId },
      select: { id: true },
    });
    if (!wh) throw new NotFoundException(`warehouseId ${dto.warehouseId} not found`);

    if (dto.customerId?.trim()) {
      const cust = await this.prisma.nx01Partner.findFirst({
        where: { id: dto.customerId.trim(), tenantId },
        select: { id: true },
      });
      if (!cust) throw new NotFoundException(`customerId ${dto.customerId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const docNo = await this.allocDocNo(tx, tenantId);
      const created = await tx.nx02Demand.create({
        data: {
          tenantId,
          docNo,
          demandType,
          partId: dto.partId.trim(),
          warehouseId: dto.warehouseId.trim(),
          qty: new PrismaNs.Decimal(dto.qty),
          customerId: dto.customerId?.trim() || null,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          status: 'O',
          remark: dto.remark?.trim() || '手動新增',
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: DEMAND_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_demand',
        entityId: created.id,
        entityCode: created.docNo,
        summary: `手動新增採購需求（${demandType === 'O' ? '客訂' : '補貨'}）`,
        afterData: created as object,
      });

      return created;
    });
  }

  async ignore(user: RequestUser, id: string, dto: IgnoreDemandDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Demand.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, docNo: true },
    });
    if (!existing) throw new NotFoundException('Demand not found');
    if (existing.status === 'I') throw new BadRequestException('Demand 已忽略');
    if (existing.status === 'C') throw new BadRequestException('Demand 已完成、無法忽略');

    const updated = await this.prisma.nx02Demand.update({
      where: { id },
      data: {
        status: 'I',
        ignoreReason: dto.ignoreReason.trim(),
        updatedBy: user.sub,
      },
      select: DEMAND_SEL,
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_demand',
      entityId: id,
      entityCode: existing.docNo,
      summary: `忽略採購需求：${dto.ignoreReason.trim()}`,
      afterData: updated as object,
    });

    return updated;
  }
}
