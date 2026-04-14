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
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocNx05DocNo } from '../../shared/nx05/nx05-doc-no';
import { assertFinancePeriodMutable } from '../../shared/nx05/nx05-period-lock';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';
import { assertNoteApiStatusTransition, NoteApiStatus } from '../../shared/nx05/nx05-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateNoteDto, PatchNoteDto } from './dto/note.dto';

const NOTE_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  noteType: true,
  direction: true,
  partnerId: true,
  noteNo: true,
  bankName: true,
  bankAccount: true,
  amount: true,
  currencyId: true,
  issueDate: true,
  dueDate: true,
  status: true,
  clearedAt: true,
  bouncedAt: true,
  bouncedReason: true,
  paylogId: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function mapNoteApiStatus(row: { status: string }) {
  return row.status;
}

@Injectable()
export class NoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx05ListQueryDto): Prisma.Nx05NoteWhereInput {
    const parts: Prisma.Nx05NoteWhereInput[] = [{ tenantId }];
    const s = q.search?.trim();
    if (s) {
      parts.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { noteNo: { contains: s, mode: 'insensitive' } },
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
      this.prisma.nx05Note.count({ where }),
      this.prisma.nx05Note.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: NOTE_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => ({ ...r, displayStatus: mapNoteApiStatus(r) })) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx05Note.findFirst({
      where: { id, tenantId },
      select: NOTE_SEL,
    });
    if (!row) throw new NotFoundException('Note not found');
    return { ...row, displayStatus: mapNoteApiStatus(row) };
  }

  async create(user: RequestUser, dto: CreateNoteDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.nx01Partner.findFirst({
        where: { id: dto.partnerId, tenantId },
        select: { id: true },
      });
      if (!p) throw new NotFoundException('partnerId not found');
      const issueDate = new Date(dto.issueDate);
      await assertFinancePeriodMutable(tx, tenantId, issueDate);
      const docNo = await allocNx05DocNo(tx, tenantId, 'NT', 'HQ0');
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');
      const row = await tx.nx05Note.create({
        data: {
          tenantId,
          docNo,
          noteType: dto.noteType.trim(),
          direction: dto.direction.trim(),
          partnerId: dto.partnerId,
          noteNo: dto.noteNo.trim(),
          bankName: dto.bankName.trim(),
          bankAccount: dto.bankAccount?.trim() || null,
          amount: new PrismaNs.Decimal(dto.amount),
          currencyId: currId,
          issueDate,
          dueDate: new Date(dto.dueDate),
          status: NoteApiStatus.DRAFT,
          paylogId: dto.paylogId?.trim() || null,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: NOTE_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'CREATE',
        entityTable: 'nx05_note',
        entityId: row.id,
        entityCode: row.docNo,
        summary: '建立票據',
        afterData: row as object,
      });
      return { ...row, displayStatus: mapNoteApiStatus(row) };
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchNoteDto) {
    const tenantId = requireTenantId(user);
    if (!dto.status) throw new BadRequestException('status is required');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx05Note.findFirst({
        where: { id, tenantId },
        select: { ...NOTE_SEL },
      });
      if (!existing) throw new NotFoundException('Note not found');
      await assertFinancePeriodMutable(tx, tenantId, new Date(existing.issueDate));
      if (dto.status === existing.status) return { ...existing, displayStatus: mapNoteApiStatus(existing) };
      assertNoteApiStatusTransition(existing.status, dto.status!);
      const data: Prisma.Nx05NoteUpdateInput = {
        status: dto.status,
        updatedBy: user.sub,
        ...(dto.status === NoteApiStatus.CLEARED ? { clearedAt: new Date() } : {}),
        ...(dto.status === NoteApiStatus.BOUNCED
          ? {
              bouncedAt: new Date(),
              bouncedReason: dto.bouncedReason?.trim() || 'BOUNCED',
            }
          : {}),
      };
      await tx.nx05Note.update({ where: { id }, data });
      const row = await tx.nx05Note.findFirst({ where: { id, tenantId }, select: NOTE_SEL });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX05',
        action: 'UPDATE',
        entityTable: 'nx05_note',
        entityId: id,
        entityCode: existing.docNo,
        summary: `票據 ${existing.status} -> ${dto.status}`,
        beforeData: existing as object,
        afterData: row as object,
      });
      return { ...row!, displayStatus: mapNoteApiStatus(row!) };
    });
  }

  async remove(user: RequestUser, id: string) {
    return this.patch(user, id, { status: NoteApiStatus.VOIDED });
  }
}
