// apps/nx-api/src/nx01/part-model/part-model.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0 §2 / §3 / §5
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
  CreatePartModelDto,
  ListPartModelQueryDto,
  UpdatePartModelDto,
} from './dto/part-model.dto';

const SEL = {
  id: true,
  tenantId: true,
  partId: true,
  modelId: true,
  fitLevel: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  part: { select: { code: true, name: true } },
  model: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01PartModelGetPayload<{ select: typeof SEL }>;

@Injectable()
export class PartModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { part, model, ...rest } = r;
    return {
      ...rest,
      partCode: part?.code ?? null,
      partName: part?.name ?? null,
      modelCode: model?.code ?? null,
      modelName: model?.name ?? null,
    };
  }

  /** 規格 §3.2.1：跨 tenant + isActive 雙端檢核（part + model 兩邊都要綠） */
  private async validateReferences(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    modelId: string,
  ): Promise<void> {
    const [part, model] = await Promise.all([
      tx.nx01Part.findFirst({
        where: { id: partId, tenantId },
        select: { id: true, isActive: true },
      }),
      tx.nx01Model.findFirst({
        where: { id: modelId, tenantId },
        select: { id: true, isActive: true },
      }),
    ]);
    if (!part) throw new NotFoundException(`partId not found for tenant: ${partId}`);
    if (!model) throw new NotFoundException(`modelId not found for tenant: ${modelId}`);
    if (!part.isActive) {
      throw new BadRequestException(`料件 ${partId} 已停用、不可建適配（規格 §5.7）`);
    }
    if (!model.isActive) {
      throw new BadRequestException(`車型 ${modelId} 已停用、不可建適配（規格 §5.7）`);
    }
  }

  private whereList(
    tenantId: string,
    q: ListPartModelQueryDto,
  ): Prisma.Nx01PartModelWhereInput {
    const where: Prisma.Nx01PartModelWhereInput = { tenantId };
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.modelId?.trim()) where.modelId = q.modelId.trim();
    if (q.fitLevel !== undefined) where.fitLevel = q.fitLevel;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartModelQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartModel.count({ where }),
      this.prisma.nx01PartModel.findMany({
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
    const row = await this.prisma.nx01PartModel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Part model not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartModelDto) {
    const tenantId = requireTenantId(user);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.validateReferences(tx, tenantId, dto.partId, dto.modelId);

      // 規格 §3.2.1 + §5.5：unique 衝突檢核（(tenantId, partId, modelId)）
      const dup = await tx.nx01PartModel.findFirst({
        where: { tenantId, partId: dto.partId, modelId: dto.modelId },
        select: { id: true },
      });
      if (dup)
        throw new ConflictException('相同料件 + 車型適配已存在（規格 §5.5）');

      return tx.nx01PartModel.create({
        data: {
          tenantId,
          partId: dto.partId,
          modelId: dto.modelId,
          fitLevel: dto.fitLevel,
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
      entityTable: 'nx01_part_model',
      entityId: row.id,
      entityCode: `${row.partId}↔${row.modelId}(${row.fitLevel})`,
      summary: '建立料件車型適配',
      afterData: row as object,
    });

    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePartModelDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartModel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part model not found');

    const row = await this.prisma.nx01PartModel.update({
      where: { id },
      data: {
        ...(dto.fitLevel !== undefined ? { fitLevel: dto.fitLevel } : {}),
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
      entityTable: 'nx01_part_model',
      entityId: id,
      entityCode: `${row.partId}↔${row.modelId}(${row.fitLevel})`,
      summary: '修改料件車型適配',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartModel.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part model not found');
    const row = await this.prisma.nx01PartModel.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_model',
      entityId: id,
      entityCode: `${row.partId}↔${row.modelId}(${row.fitLevel})`,
      summary: '停用料件車型適配',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
