import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { assertClosingStatusTransition, ClosingStatus } from '../../shared/nx05/nx05-state-machine';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePeriodCloseDto, PatchPeriodCloseDto } from './dto/period-close.dto';

const CL_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  closingDate: true,
  closedAt: true,
  closedBy: true,
  isAuto: true,
  reportPrintedAt: true,
  reportPrintedBy: true,
  status: true,
  reopenedAt: true,
  reopenedBy: true,
  reopenReason: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PeriodCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05ClosingWhereInput {
    const parts: Prisma.Nx05ClosingWhereInput[] = [{ tenantId }];
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
      this.prisma.nx05Closing.count({ where }),
      this.prisma.nx05Closing.findMany({
        where,
        orderBy: [{ closingDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: CL_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Closing.findFirst({
      where: { id, tenantId },
      select: CL_SEL,
    });
    if (!row) throw new NotFoundException('Period close not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePeriodCloseDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const cd = new Date(dto.closingDate);
      const docNo = await allocNx05DocNo(tx, tenantId, 'CL', 'HQ0');
      const row = await tx.nx05Closing.create({
        data: {
          tenantId,
          docNo,
          closingDate: cd,
          status: ClosingStatus.OPEN,
          isAuto: dto.isAuto ?? false,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: CL_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_closing',
        entityId: row.id,
        entityCode: row.docNo,
        summary: '建立關帳單',
        afterData: row as object,
      });
      return row;
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchPeriodCloseDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Closing.findFirst({
        where: { id, tenantId },
        select: { ...CL_SEL },
      });
      if (!existing) throw new NotFoundException('Period close not found');
      if (dto.status === existing.status) return existing;
      assertClosingStatusTransition(existing.status, dto.status!);
      const data: Prisma.Nx05ClosingUpdateInput = {
        status: dto.status,
        updatedBy: user.sub,
      };
      if (dto.status === ClosingStatus.CLOSED) {
        data.closedAt = new Date();
        data.closedBy = user.sub;
      }
      if (dto.status === ClosingStatus.REOPENED) {
        if (!dto.reopenReason?.trim()) throw new BadRequestException('reopenReason required');
        data.reopenedAt = new Date();
        data.reopenedBy = user.sub;
        data.reopenReason = dto.reopenReason.trim();
      }
      await tx.nx05Closing.update({ where: { id }, data });
      const row = await tx.nx05Closing.findFirst({ where: { id, tenantId }, select: CL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_closing',
        entityId: id,
        entityCode: existing.docNo,
        summary: `關帳 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return row!;
    });
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Closing.findFirst({
        where: { id, tenantId },
        select: { ...CL_SEL },
      });
      if (!existing) throw new NotFoundException('Period close not found');
      if (existing.status !== ClosingStatus.OPEN) {
        throw new BadRequestException('Only OPEN closing record can be deleted');
      }
      await tx.nx05Closing.delete({ where: { id } });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_closing',
        entityId: id,
        entityCode: existing.docNo,
        summary: '刪除關帳草稿',
        beforeData: existing as object,
      });
      return { ok: true, id };
    });
  }
}
