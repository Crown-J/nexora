// apps/nx-api/src/nx01/part-kit/part-kit.service.ts
// 2026-06-26：組合/拆解組件關係 service（表頭 nx01_part_kit + 明細 nx01_part_kit_item）
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreatePartKitDto,
  ListPartKitQueryDto,
  PartKitItemInput,
  UpdatePartKitDto,
} from './dto/part-kit.dto';

const SEL = {
  id: true,
  tenantId: true,
  wholePartId: true,
  name: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  wholePart: { select: { code: true, name: true } },
  items: {
    select: {
      id: true,
      partId: true,
      qty: true,
      sortNo: true,
      remark: true,
      isActive: true,
      part: { select: { code: true, name: true } },
    },
  },
} as const;

type Row = Prisma.Nx01PartKitGetPayload<{ select: typeof SEL }>;

@Injectable()
export class PartKitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { wholePart, items, ...rest } = r;
    return {
      ...rest,
      wholePartCode: wholePart?.code ?? null,
      wholePartName: wholePart?.name ?? null,
      items: [...items]
        .sort((a, b) => a.sortNo - b.sortNo)
        .map((it) => ({
        id: it.id,
        partId: it.partId,
        qty: it.qty.toString(),
        sortNo: it.sortNo,
        remark: it.remark,
        isActive: it.isActive,
        partCode: it.part?.code ?? null,
        partName: it.part?.name ?? null,
      })),
    };
  }

  /** 驗證整體件與組件存在、屬本租戶、啟用中；組件不可重複、不可等於整體件 */
  private async validateRefs(
    tx: Prisma.TransactionClient,
    tenantId: string,
    wholePartId: string,
    items: PartKitItemInput[],
  ): Promise<void> {
    if (items.length === 0) {
      throw new BadRequestException('組件明細至少需 1 筆');
    }
    const whole = await tx.nx01Part.findFirst({
      where: { id: wholePartId, tenantId },
      select: { id: true, isActive: true },
    });
    if (!whole) throw new NotFoundException(`wholePartId not found for tenant: ${wholePartId}`);
    if (!whole.isActive) throw new BadRequestException('整體件已停用、不可建組件關係');

    const seen = new Set<string>();
    for (const it of items) {
      if (it.partId === wholePartId) {
        throw new BadRequestException('組件不可等於整體件');
      }
      if (seen.has(it.partId)) {
        throw new BadRequestException(`組件料號重複：${it.partId}`);
      }
      seen.add(it.partId);
    }
    const found = await tx.nx01Part.findMany({
      where: { tenantId, id: { in: [...seen] } },
      select: { id: true, isActive: true },
    });
    const foundMap = new Map(found.map((p) => [p.id, p.isActive]));
    for (const id of seen) {
      const active = foundMap.get(id);
      if (active === undefined) throw new NotFoundException(`組件料號不存在：${id}`);
      if (!active) throw new BadRequestException(`組件料號已停用：${id}`);
    }
  }

  async list(user: RequestUser, q: ListPartKitQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01PartKitWhereInput = { tenantId };
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.wholePartId?.trim()) where.wholePartId = q.wholePartId.trim();
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };

    const [total, rows] = await Promise.all([
      this.prisma.nx01PartKit.count({ where }),
      this.prisma.nx01PartKit.findMany({
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
    const row = await this.prisma.nx01PartKit.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part kit not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartKitDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.validateRefs(tx, tenantId, dto.wholePartId, dto.items);
      const created = await tx.nx01PartKit.create({
        data: {
          tenantId,
          wholePartId: dto.wholePartId,
          name: dto.name.trim(),
          remark: dto.remark?.trim() || null,
          sortNo: dto.sortNo ?? 0,
          isActive: dto.isActive ?? true,
          createdBy: user.sub,
          updatedBy: user.sub,
          items: {
            create: dto.items.map((it, i) => ({
              tenantId,
              partId: it.partId,
              qty: it.qty,
              sortNo: it.sortNo ?? i,
              remark: it.remark?.trim() || null,
              createdBy: user.sub,
              updatedBy: user.sub,
            })),
          },
        },
        select: SEL,
      });
      return created;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_part_kit',
      entityId: row.id,
      entityCode: row.name,
      summary: '建立組合/拆解組件關係',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePartKitDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartKit.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part kit not found');

    const row = await this.prisma.$transaction(async (tx) => {
      // items 提供時整批取代（先刪後建）
      if (dto.items !== undefined) {
        await this.validateRefs(tx, tenantId, existing.wholePartId, dto.items);
        await tx.nx01PartKitItem.deleteMany({ where: { tenantId, kitId: id } });
        await tx.nx01PartKitItem.createMany({
          data: dto.items.map((it, i) => ({
            tenantId,
            kitId: id,
            partId: it.partId,
            qty: it.qty,
            sortNo: it.sortNo ?? i,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          })),
        });
      }
      return tx.nx01PartKit.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          updatedBy: user.sub,
        },
        select: SEL,
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part_kit',
      entityId: id,
      entityCode: row.name,
      summary: '修改組合/拆解組件關係',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartKit.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part kit not found');
    const row = await this.prisma.nx01PartKit.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_kit',
      entityId: id,
      entityCode: row.name,
      summary: '停用組合/拆解組件關係',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
