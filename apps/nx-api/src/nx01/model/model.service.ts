// apps/nx-api/src/nx01/model/model.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-13-model.md v1.0 §2 / §3 / §5
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCarBrandRefs } from '../../shared/nx01/resolve-brand-refs';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateModelDto,
  ListModelQueryDto,
  UpdateModelDto,
} from './dto/model.dto';

// W6-Phase 5 2026-06-06：舊 car_brand_id 已 drop、brandId 為主鍵
const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  brandId: true,
  modelYearFrom: true,
  modelYearTo: true,
  engineId: true,
  transmissionId: true,
  drivetrainId: true,
  modelTypeId: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  brand: { select: { code: true, name: true } },
  engine: { select: { code: true, name: true } },
  transmission: { select: { code: true, name: true } },
  drivetrain: { select: { code: true, name: true } },
  modelType: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01ModelGetPayload<{ select: typeof SEL }>;

@Injectable()
export class ModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { brand, engine, transmission, drivetrain, modelType, ...rest } = r;
    return {
      ...rest,
      // W6-Phase 5：前端 picker key carBrandId、值為 brand.id
      carBrandId: rest.brandId,
      carBrandCode: brand?.code ?? null,
      carBrandName: brand?.name ?? null,
      engineCode: engine?.code ?? null,
      engineName: engine?.name ?? null,
      transmissionCode: transmission?.code ?? null,
      transmissionName: transmission?.name ?? null,
      drivetrainCode: drivetrain?.code ?? null,
      drivetrainName: drivetrain?.name ?? null,
      modelTypeCode: modelType?.code ?? null,
      modelTypeName: modelType?.name ?? null,
    };
  }

  /** 規格 §3.2 / §5.7：年份業務檢核 */
  private validateYears(from: number, to: number | null | undefined) {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 5;
    if (from < 1900 || from > maxYear) {
      throw new BadRequestException(
        `modelYearFrom must be between 1900 and ${maxYear}, got ${from}`,
      );
    }
    if (to !== null && to !== undefined) {
      if (to < 1900 || to > currentYear + 10) {
        throw new BadRequestException(
          `modelYearTo must be between 1900 and ${currentYear + 10}, got ${to}`,
        );
      }
      if (to < from) {
        throw new BadRequestException(
          `結束年份不可早於起始年份（${to} < ${from}、規格 §5.7）`,
        );
      }
    }
  }

  private whereList(tenantId: string, q: ListModelQueryDto): Prisma.Nx01ModelWhereInput {
    const where: Prisma.Nx01ModelWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    // W6-Phase 5：filter by brandId
    if (q.carBrandId?.trim()) where.brandId = q.carBrandId.trim();
    if (q.modelYearFrom !== undefined) where.modelYearFrom = q.modelYearFrom;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListModelQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Model.count({ where }),
      this.prisma.nx01Model.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Model.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Model not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateModelDto) {
    const tenantId = requireTenantId(user);
    this.validateYears(dto.modelYearFrom, dto.modelYearTo ?? null);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Model.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Model code already exists in this tenant');
    // W6-Phase 5：dto.carBrandId 為 brand.id、必須驗證到 isCar=true brand
    const refs = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
    if (!refs.brandId) {
      throw new BadRequestException(
        'carBrandId 對應不到車廠品牌（請確認 picker value 為 nx01_brand isCar=true row）',
      );
    }
    const row = await this.prisma.nx01Model.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        brandId: refs.brandId,
        modelYearFrom: dto.modelYearFrom,
        modelYearTo: dto.modelYearTo ?? null,
        engineId: dto.engineId?.trim() || null,
        transmissionId: dto.transmissionId?.trim() || null,
        drivetrainId: dto.drivetrainId?.trim() || null,
        modelTypeId: dto.modelTypeId?.trim() || null,
        remark: dto.remark?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_model',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立車型主檔',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateModelDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Model.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Model not found');

    // 年份業務檢核（用 update 後的最終值）
    const nextFrom = dto.modelYearFrom ?? existing.modelYearFrom;
    const nextTo = dto.modelYearTo !== undefined ? dto.modelYearTo : existing.modelYearTo;
    this.validateYears(nextFrom, nextTo);

    // W6-Phase 5：dto.carBrandId 為 brand.id、必須驗證
    let brandRefs: { brandId: string } | null = null;
    if (dto.carBrandId !== undefined) {
      const r = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
      if (!r.brandId) {
        throw new BadRequestException(
          'carBrandId 對應不到車廠品牌（請確認 picker value 為 nx01_brand isCar=true row）',
        );
      }
      brandRefs = { brandId: r.brandId };
    }

    const row = await this.prisma.nx01Model.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(brandRefs ? { brandId: brandRefs.brandId } : {}),
        ...(dto.modelYearFrom !== undefined ? { modelYearFrom: dto.modelYearFrom } : {}),
        ...(dto.modelYearTo !== undefined ? { modelYearTo: dto.modelYearTo } : {}),
        ...(dto.engineId !== undefined ? { engineId: dto.engineId?.trim() || null } : {}),
        ...(dto.transmissionId !== undefined
          ? { transmissionId: dto.transmissionId?.trim() || null }
          : {}),
        ...(dto.drivetrainId !== undefined
          ? { drivetrainId: dto.drivetrainId?.trim() || null }
          : {}),
        ...(dto.modelTypeId !== undefined
          ? { modelTypeId: dto.modelTypeId?.trim() || null }
          : {}),
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
      entityTable: 'nx01_model',
      entityId: id,
      entityCode: row.code,
      summary: '修改車型主檔',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Model.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Model not found');
    const row = await this.prisma.nx01Model.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_model',
      entityId: id,
      entityCode: row.code,
      summary: '停用車型主檔',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
