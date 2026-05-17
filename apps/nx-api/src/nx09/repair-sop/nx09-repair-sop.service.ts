// apps/nx-api/src/nx09/repair-sop/nx09-repair-sop.service.ts
// NX09 RepairSop service（維修 SOP 結構化、含 carModelFilter + partModelIds 雙向 wire）
//
// 對齊：overview v0.2.0 §6 §7 + plan v0.1.0 §2.L4 §2.L5 + Crown Q2=a/Q6=a
// 業界改革 ⭐⭐⭐：業界中小汽配 ERP 維修 SOP 結構化罕見

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateRepairSopDto, LinkPartModelDto, PatchRepairSopDto } from './dto/repair-sop.dto';

@Injectable()
export class Nx09RepairSopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private validateJsonArrayOrThrow(field: string, raw: string | undefined | null) {
    if (raw === undefined || raw === null || raw === '') return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('not array');
    } catch {
      throw new BadRequestException(`${field} must be valid JSON array`);
    }
  }

  async list(user: RequestUser, query?: { category?: string; carModelFilter?: string; isActive?: boolean }) {
    const tenantId = requireTenantId(user);
    const where: Record<string, unknown> = { tenantId };
    if (query?.category) where.category = query.category;
    if (query?.carModelFilter) where.carModelFilter = query.carModelFilter.trim();
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    const rows = await this.prisma.nx09RepairSop.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      take: 200,
      include: {
        carModel: { select: { id: true, code: true, name: true } },
      },
    });
    return { ok: true, count: rows.length, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09RepairSop.findFirst({
      where: { id: id.trim(), tenantId },
      include: {
        carModel: { select: { id: true, code: true, name: true } },
        rev_Nx09RepairSopPartModel_sop: {
          take: 50,
          include: {
            partModel: {
              include: {
                part: { select: { id: true, code: true, name: true } },
                model: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('RepairSop not found');
    return { ok: true, row };
  }

  async findByCarModel(user: RequestUser, modelId: string) {
    const tenantId = requireTenantId(user);
    const model = await this.prisma.nx01Model.findFirst({
      where: { id: modelId.trim(), tenantId },
      select: { id: true, code: true, name: true },
    });
    if (!model) throw new NotFoundException('Model not found');
    // 適用 = 通用（null）OR 指定該車型
    const rows = await this.prisma.nx09RepairSop.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ carModelFilter: null }, { carModelFilter: model.id }],
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      take: 200,
    });
    return { ok: true, modelId: model.id, modelCode: model.code, count: rows.length, rows };
  }

  async create(user: RequestUser, dto: CreateRepairSopDto) {
    const tenantId = requireTenantId(user);
    this.validateJsonArrayOrThrow('steps', dto.steps);
    this.validateJsonArrayOrThrow('tools', dto.tools);
    this.validateJsonArrayOrThrow('warnings', dto.warnings);
    this.validateJsonArrayOrThrow('photos', dto.photos);

    if (dto.carModelFilter) {
      const m = await this.prisma.nx01Model.findFirst({
        where: { id: dto.carModelFilter.trim(), tenantId },
        select: { id: true },
      });
      if (!m) throw new BadRequestException('carModelFilter invalid');
    }

    const existing = await this.prisma.nx09RepairSop.findFirst({
      where: { tenantId, code: dto.code.trim() },
      select: { id: true },
    });
    if (existing) throw new BadRequestException(`RepairSop code='${dto.code}' already exists`);

    const created = await this.prisma.nx09RepairSop.create({
      data: {
        tenantId,
        code: dto.code.trim(),
        title: dto.title.trim(),
        category: dto.category,
        steps: dto.steps,
        tools: dto.tools ?? null,
        warnings: dto.warnings ?? null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        photos: dto.photos ?? null,
        carModelFilter: dto.carModelFilter?.trim() ?? null,
        difficulty: dto.difficulty ?? 1,
        isActive: true,
        remark: dto.remark?.trim() ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'CREATE',
      entityTable: 'nx09_repair_sop',
      entityId: created.id,
      entityCode: created.code,
      summary: `RepairSop 建立：${created.code} ${created.title} (${created.category})`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  async patch(user: RequestUser, id: string, dto: PatchRepairSopDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09RepairSop.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('RepairSop not found');

    if (dto.steps !== undefined) this.validateJsonArrayOrThrow('steps', dto.steps);
    if (dto.tools !== undefined) this.validateJsonArrayOrThrow('tools', dto.tools);
    if (dto.warnings !== undefined) this.validateJsonArrayOrThrow('warnings', dto.warnings);
    if (dto.photos !== undefined) this.validateJsonArrayOrThrow('photos', dto.photos);

    if (dto.carModelFilter !== undefined && dto.carModelFilter) {
      const m = await this.prisma.nx01Model.findFirst({
        where: { id: dto.carModelFilter.trim(), tenantId },
        select: { id: true },
      });
      if (!m) throw new BadRequestException('carModelFilter invalid');
    }

    const updated = await this.prisma.nx09RepairSop.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.steps !== undefined ? { steps: dto.steps } : {}),
        ...(dto.tools !== undefined ? { tools: dto.tools ?? null } : {}),
        ...(dto.warnings !== undefined ? { warnings: dto.warnings ?? null } : {}),
        ...(dto.estimatedMinutes !== undefined ? { estimatedMinutes: dto.estimatedMinutes ?? null } : {}),
        ...(dto.photos !== undefined ? { photos: dto.photos ?? null } : {}),
        ...(dto.carModelFilter !== undefined ? { carModelFilter: dto.carModelFilter?.trim() || null } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() ?? null } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async delete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09RepairSop.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('RepairSop not found');
    return this.prisma.$transaction(async (tx) => {
      // 先刪 link 表 row、再刪主檔
      await tx.nx09RepairSopPartModel.deleteMany({ where: { repairSopId: existing.id } });
      await tx.nx09RepairSop.delete({ where: { id: existing.id } });
      return { ok: true, deletedId: existing.id };
    });
  }

  // ===== RepairSop ↔ PartModel 雙向 wire（業界改革 ⭐⭐⭐ Phase 5）=====

  /** 列 SOP 連動的 PartModel + part snapshot。 */
  async listPartsBySop(user: RequestUser, sopId: string) {
    const tenantId = requireTenantId(user);
    const sop = await this.prisma.nx09RepairSop.findFirst({
      where: { id: sopId.trim(), tenantId },
      select: { id: true, code: true, title: true },
    });
    if (!sop) throw new NotFoundException('RepairSop not found');
    const rows = await this.prisma.nx09RepairSopPartModel.findMany({
      where: { repairSopId: sop.id },
      orderBy: { createdAt: 'asc' },
      include: {
        partModel: {
          include: {
            part: { select: { id: true, code: true, name: true } },
            model: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    return { ok: true, sopId: sop.id, sopCode: sop.code, sopTitle: sop.title, count: rows.length, rows };
  }

  /** 反向查：partModelId → 哪些 SOP 適用（業界改革 ⭐⭐⭐ 業務員查料件 → 看 SOP）。 */
  async listSopsByPartModel(user: RequestUser, partModelId: string) {
    const tenantId = requireTenantId(user);
    const pm = await this.prisma.nx01PartModel.findFirst({
      where: { id: partModelId.trim(), tenantId },
      include: {
        part: { select: { code: true, name: true } },
        model: { select: { code: true, name: true } },
      },
    });
    if (!pm) throw new NotFoundException('PartModel not found');
    const rows = await this.prisma.nx09RepairSopPartModel.findMany({
      where: { partModelId: pm.id },
      orderBy: { createdAt: 'desc' },
      include: {
        repairSop: {
          select: {
            id: true, code: true, title: true, category: true,
            estimatedMinutes: true, difficulty: true, isActive: true,
          },
        },
      },
    });
    return {
      ok: true,
      partModelId: pm.id,
      partCode: pm.part.code,
      partName: pm.part.name,
      modelCode: pm.model.code,
      modelName: pm.model.name,
      count: rows.length,
      rows,
    };
  }

  /** SOP 一次掛多個 PartModel（idempotent：既有 (sopId, partModelId) skip）。 */
  async linkParts(user: RequestUser, sopId: string, dto: LinkPartModelDto) {
    const tenantId = requireTenantId(user);
    const sop = await this.prisma.nx09RepairSop.findFirst({
      where: { id: sopId.trim(), tenantId },
      select: { id: true },
    });
    if (!sop) throw new NotFoundException('RepairSop not found');

    const wantIds = Array.from(new Set(dto.partModelIds.map((x) => x.trim()).filter(Boolean)));
    if (!wantIds.length) throw new BadRequestException('partModelIds empty');

    // 校驗 partModelIds 同 tenant
    const valid = await this.prisma.nx01PartModel.findMany({
      where: { id: { in: wantIds }, tenantId },
      select: { id: true },
    });
    const validIds = new Set(valid.map((x) => x.id));
    const invalidIds = wantIds.filter((x) => !validIds.has(x));
    if (invalidIds.length) {
      throw new BadRequestException(`partModelIds invalid: ${invalidIds.join(',')}`);
    }

    // 既有 link skip（idempotent）
    const existing = await this.prisma.nx09RepairSopPartModel.findMany({
      where: { repairSopId: sop.id, partModelId: { in: wantIds } },
      select: { partModelId: true },
    });
    const existingSet = new Set(existing.map((x) => x.partModelId));
    const newIds = wantIds.filter((x) => !existingSet.has(x));

    const created: Array<{ id: string; partModelId: string }> = [];
    for (const pmId of newIds) {
      const row = await this.prisma.nx09RepairSopPartModel.create({
        data: {
          repairSopId: sop.id,
          partModelId: pmId,
          notes: dto.notes?.trim() ?? null,
          createdBy: user.sub,
        },
        select: { id: true, partModelId: true },
      });
      created.push(row);
    }

    return {
      ok: true,
      sopId: sop.id,
      requested: wantIds.length,
      created: created.length,
      skipped: wantIds.length - created.length,
      createdRows: created,
    };
  }

  async unlinkPart(user: RequestUser, sopId: string, partModelId: string) {
    const tenantId = requireTenantId(user);
    const sop = await this.prisma.nx09RepairSop.findFirst({
      where: { id: sopId.trim(), tenantId },
      select: { id: true },
    });
    if (!sop) throw new NotFoundException('RepairSop not found');
    const link = await this.prisma.nx09RepairSopPartModel.findFirst({
      where: { repairSopId: sop.id, partModelId: partModelId.trim() },
      select: { id: true },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.prisma.nx09RepairSopPartModel.delete({ where: { id: link.id } });
    return { ok: true, deletedLinkId: link.id };
  }
}
