import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import {
  AllowanceApiStatus,
  AllowanceDbStatus,
  assertAllowanceApiStatusTransition,
} from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateAllowanceDto, PatchAllowanceDto } from './dto/allowance.dto';

const AL_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  allowanceType: true,
  partnerId: true,
  allowanceDate: true,
  refArId: true,
  refApId: true,
  totalAmount: true,
  status: true,
  approvedAt: true,
  approvedBy: true,
  rejectReason: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function toApiStatus(row: { status: string; rejectReason: string | null }): string {
  if (row.status === AllowanceDbStatus.VOIDED && row.rejectReason?.trim()) return AllowanceApiStatus.REJECTED;
  if (row.status === AllowanceDbStatus.APPROVED) return AllowanceApiStatus.APPROVED;
  if (row.status === AllowanceDbStatus.DRAFT) return AllowanceApiStatus.DRAFT;
  return row.status;
}

@Injectable()
export class AllowanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05AllowanceWhereInput {
    const parts: Prisma.Nx05AllowanceWhereInput[] = [{ tenantId }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    const st = q.status?.trim();
    if (st === AllowanceApiStatus.REJECTED) {
      parts.push({ status: AllowanceDbStatus.VOIDED, rejectReason: { not: null } });
    } else if (st === AllowanceApiStatus.APPROVED) {
      parts.push({ status: AllowanceDbStatus.APPROVED });
    } else if (st === AllowanceApiStatus.DRAFT) {
      parts.push({ status: AllowanceDbStatus.DRAFT });
    } else if (st) {
      parts.push({ status: st });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx05ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx05Allowance.count({ where }),
      this.prisma.nx05Allowance.findMany({
        where,
        orderBy: [{ allowanceDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: AL_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => ({ ...r, displayStatus: toApiStatus(r) })) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Allowance.findFirst({
      where: { id, tenantId },
      select: AL_SEL,
    });
    if (!row) throw new NotFoundException('Allowance not found');
    return { ...row, displayStatus: toApiStatus(row) };
  }

  async create(user: RequestUser, dto: CreateAllowanceDto) {
    const tenantId = requireTenantId(user);
    if (!dto.items?.length) throw new BadRequestException('items required');
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.nx01Partner.findFirst({
        where: { id: dto.partnerId, tenantId },
        select: { id: true },
      });
      if (!partner) throw new NotFoundException('partnerId not found');
      const ad = new Date(dto.allowanceDate);
      await assertFinancePeriodMutable(tx, tenantId, ad);
      if (dto.allowanceType === 'S' && !dto.refArId?.trim()) {
        throw new BadRequestException('refArId required for sales allowance');
      }
      if (dto.allowanceType === 'P' && !dto.refApId?.trim()) {
        throw new BadRequestException('refApId required for purchase allowance');
      }
      let total = new PrismaNs.Decimal(0);
      for (const it of dto.items) {
        total = total.add(new PrismaNs.Decimal(it.amount));
      }
      const docNo = await allocNx05DocNo(tx, tenantId, 'AL', 'HQ0');
      const head = await tx.nx05Allowance.create({
        data: {
          tenantId,
          docNo,
          allowanceType: dto.allowanceType.trim(),
          partnerId: dto.partnerId,
          allowanceDate: ad,
          refArId: dto.refArId?.trim() || null,
          refApId: dto.refApId?.trim() || null,
          totalAmount: total,
          status: AllowanceDbStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: AL_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        await tx.nx05AllowanceItem.create({
          data: {
            allowanceId: head.id,
            lineNo: line++,
            reason: it.reason.trim(),
            amount: new PrismaNs.Decimal(it.amount),
            disposalMethod: it.disposalMethod?.trim() || 'O',
            refDocId: it.refDocId?.trim() || null,
            refDocType: it.refDocType?.trim() || null,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      const row = await tx.nx05Allowance.findFirst({ where: { id: head.id, tenantId }, select: AL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_allowance',
        entityId: head.id,
        entityCode: head.docNo,
        summary: '建立折讓單',
        afterData: row as object,
      });
      return { ...row!, displayStatus: toApiStatus(row!) };
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchAllowanceDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Allowance.findFirst({
        where: { id, tenantId },
        select: { ...AL_SEL },
      });
      if (!existing) throw new NotFoundException('Allowance not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.allowanceDate));
      const fromApi = toApiStatus(existing);
      if (dto.status === fromApi) return { ...existing, displayStatus: fromApi };
      assertAllowanceApiStatusTransition(fromApi, dto.status!);

      if (dto.status === AllowanceApiStatus.APPROVED) {
        await tx.nx05Allowance.update({
          where: { id },
          data: {
            status: AllowanceDbStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: user.sub,
            rejectReason: null,
            updatedBy: user.sub,
          },
        });
      } else if (dto.status === AllowanceApiStatus.REJECTED) {
        if (!dto.rejectReason?.trim()) throw new BadRequestException('rejectReason required when rejecting');
        await tx.nx05Allowance.update({
          where: { id },
          data: {
            status: AllowanceDbStatus.VOIDED,
            rejectReason: dto.rejectReason.trim(),
            approvedAt: null,
            approvedBy: null,
            updatedBy: user.sub,
          },
        });
      }
      const row = await tx.nx05Allowance.findFirst({ where: { id, tenantId }, select: AL_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_allowance',
        entityId: id,
        entityCode: existing.docNo,
        summary: `折讓 ${fromApi} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return { ...row!, displayStatus: toApiStatus(row!) };
    });
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Allowance.findFirst({
        where: { id, tenantId },
        select: { ...AL_SEL },
      });
      if (!existing) throw new NotFoundException('Allowance not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.allowanceDate));
      if (existing.status !== AllowanceDbStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT allowance can be void-deleted');
      }
      await tx.nx05AllowanceItem.deleteMany({ where: { allowanceId: id } });
      await tx.nx05Allowance.delete({ where: { id } });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'DELETE',
        entityTable: 'nx05_allowance',
        entityId: id,
        entityCode: existing.docNo,
        summary: '刪除折讓草稿',
        beforeData: existing as object,
      });
      return { ok: true, id };
    });
  }
}
