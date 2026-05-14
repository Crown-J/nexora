// apps/nx-api/src/nx01/part-relation/part-relation.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0 §2 / §3 / §5
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreatePartRelationDto,
  ListPartRelationQueryDto,
  UpdatePartRelationDto,
} from './dto/part-relation.dto';

const SEL = {
  id: true,
  tenantId: true,
  partIdFrom: true,
  partIdTo: true,
  relationType: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  relPartIdFrom: { select: { code: true, name: true } },
  relPartIdTo: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01PartRelationGetPayload<{ select: typeof SEL }>;

/** R 同款（relationType=2）建議建反向 hint（Crown Q2=C UX：API 回傳建議、UI modal 提示用戶決定）*/
const RELATION_TYPE_SAME = 2;

@Injectable()
export class PartRelationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { relPartIdFrom, relPartIdTo, ...rest } = r;
    return {
      ...rest,
      partFromCode: relPartIdFrom?.code ?? null,
      partFromName: relPartIdFrom?.name ?? null,
      partToCode: relPartIdTo?.code ?? null,
      partToName: relPartIdTo?.name ?? null,
    };
  }

  /** Q7=A：自關聯 + 跨 tenant 防護 */
  private async validatePartReferences(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partIdFrom: string,
    partIdTo: string,
  ): Promise<void> {
    if (partIdFrom === partIdTo) {
      throw new BadRequestException('partIdFrom 不可等於 partIdTo（自關聯禁止、規格 §3.2 + Q7=A）');
    }
    const [from, to] = await Promise.all([
      tx.nx01Part.findFirst({ where: { id: partIdFrom, tenantId }, select: { id: true } }),
      tx.nx01Part.findFirst({ where: { id: partIdTo, tenantId }, select: { id: true } }),
    ]);
    if (!from) throw new NotFoundException(`partIdFrom not found for tenant: ${partIdFrom}`);
    if (!to) throw new NotFoundException(`partIdTo not found for tenant: ${partIdTo}`);
  }

  private whereList(
    tenantId: string,
    q: ListPartRelationQueryDto,
  ): Prisma.Nx01PartRelationWhereInput {
    const where: Prisma.Nx01PartRelationWhereInput = { tenantId };
    if (q.partIdFrom?.trim()) where.partIdFrom = q.partIdFrom.trim();
    if (q.partIdTo?.trim()) where.partIdTo = q.partIdTo.trim();
    if (q.relationType !== undefined) where.relationType = q.relationType;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartRelationQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartRelation.count({ where }),
      this.prisma.nx01PartRelation.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartRelation.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Part relation not found');
    return this.mapRow(row);
  }

  /**
   * Crown Q2=C：R 同款建立後、API 回傳 reverseHint flag
   *   UI 收到 hint 顯示 modal「是否建反向關係 B→A？」、用戶自決
   *   service 不自動建反向（避免業務人員意外）
   */
  async create(user: RequestUser, dto: CreatePartRelationDto) {
    const tenantId = requireTenantId(user);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.validatePartReferences(tx, tenantId, dto.partIdFrom, dto.partIdTo);

      // schema unique guard：(tenantId, partIdFrom, partIdTo, relationType)
      const dup = await tx.nx01PartRelation.findFirst({
        where: {
          tenantId,
          partIdFrom: dto.partIdFrom,
          partIdTo: dto.partIdTo,
          relationType: dto.relationType,
        },
        select: { id: true },
      });
      if (dup)
        throw new ConflictException(
          'part_relation 已存在相同 (partIdFrom, partIdTo, relationType)',
        );

      return tx.nx01PartRelation.create({
        data: {
          tenantId,
          partIdFrom: dto.partIdFrom,
          partIdTo: dto.partIdTo,
          relationType: dto.relationType,
          remark: dto.remark?.trim() || null,
          sortNo: dto.sortNo ?? 0,
          isActive: dto.isActive ?? true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_part_relation',
      entityId: row.id,
      entityCode: `${row.partIdFrom}→${row.partIdTo}(${row.relationType})`,
      summary: '建立料件關係',
      afterData: row as object,
    });

    // Q2=C reverseHint：R 同款（2）建議建反向、檢查反向是否已存在
    const reverseHint: { suggested: boolean; existing: boolean; message: string } = {
      suggested: false,
      existing: false,
      message: '',
    };
    if (row.relationType === RELATION_TYPE_SAME) {
      const reverseExisting = await this.prisma.nx01PartRelation.findFirst({
        where: {
          tenantId,
          partIdFrom: row.partIdTo,
          partIdTo: row.partIdFrom,
          relationType: RELATION_TYPE_SAME,
        },
        select: { id: true },
      });
      reverseHint.suggested = true;
      reverseHint.existing = !!reverseExisting;
      reverseHint.message = reverseExisting
        ? '反向關係 B→A 已存在、無需重複建'
        : '建議建反向關係 B→A（R 同款業務語意對稱）';
    }

    return { data: this.mapRow(row), reverseHint };
  }

  async update(user: RequestUser, id: string, dto: UpdatePartRelationDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartRelation.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part relation not found');

    const row = await this.prisma.nx01PartRelation.update({
      where: { id },
      data: {
        ...(dto.relationType !== undefined ? { relationType: dto.relationType } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part_relation',
      entityId: id,
      entityCode: `${row.partIdFrom}→${row.partIdTo}(${row.relationType})`,
      summary: '修改料件關係',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartRelation.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part relation not found');
    const row = await this.prisma.nx01PartRelation.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_relation',
      entityId: id,
      entityCode: `${row.partIdFrom}→${row.partIdTo}(${row.relationType})`,
      summary: '停用料件關係',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
