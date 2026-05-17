// apps/nx-api/src/nx09/system-manual/system-manual.service.ts
// NX09 SystemManual service（業界 ERP 標配、Crown Q5=b ⭐ SAP/Oracle/MS Dynamics 對標）
//
// 對齊：
//   - overview v1.0 §4（SystemManual 業界範式 + featureKey 命名規範）
//   - audit-01 §6 業界改革候選 #1
//   - Hank Q-H4：content=markdown / steps=JSON / screenshots=JSON URL（簡化版、後續軌升結構化）
//
// 業務語意：
//   - SYSADMIN 主寫入（系統手冊定義）
//   - 全員可讀（getById / getByFeatureKey）
//   - featureKey UNIQUE（一個 feature 一份手冊）

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateSystemManualDto, PatchSystemManualDto } from './dto/system-manual.dto';

@Injectable()
export class Nx09SystemManualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  async list(user: RequestUser, query?: { category?: string }) {
    const tenantId = requireTenantId(user);
    const where: { tenantId: string; category?: string } = { tenantId };
    if (query?.category) where.category = query.category.trim();
    const rows = await this.prisma.nx09SystemManual.findMany({
      where,
      orderBy: [{ category: 'asc' }, { featureKey: 'asc' }],
      take: 200,
    });
    return { ok: true, count: rows.length, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09SystemManual.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!row) throw new NotFoundException('SystemManual not found');
    return { ok: true, row };
  }

  /** 全 NEXORA 系統「？」按鈕 wire 主要呼叫 endpoint（後續軌 UI wire）。 */
  async getByFeatureKey(user: RequestUser, featureKey: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09SystemManual.findFirst({
      where: { featureKey: featureKey.trim(), tenantId, isActive: true },
    });
    if (!row) throw new NotFoundException(`SystemManual not found for featureKey=${featureKey}`);
    return { ok: true, row };
  }

  async create(user: RequestUser, dto: CreateSystemManualDto) {
    const tenantId = requireTenantId(user);
    const featureKey = dto.featureKey.trim();

    const dup = await this.prisma.nx09SystemManual.findUnique({
      where: { featureKey },
      select: { id: true, tenantId: true },
    });
    if (dup) throw new ConflictException(`SystemManual with featureKey=${featureKey} already exists`);

    const created = await this.prisma.nx09SystemManual.create({
      data: {
        tenantId,
        featureKey,
        title: dto.title.trim(),
        content: dto.content ?? null,
        steps: dto.steps ?? null,
        screenshots: dto.screenshots ?? null,
        category: dto.category ?? 'GENERAL',
        version: dto.version?.trim() ?? '1.0',
        isActive: dto.isActive ?? true,
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
      entityTable: 'nx09_system_manual',
      entityId: created.id,
      entityCode: featureKey,
      summary: `SystemManual 建立：${featureKey} ${created.title}`,
      afterData: created as object,
    });
    return { ok: true, row: created };
  }

  async patch(user: RequestUser, id: string, dto: PatchSystemManualDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09SystemManual.findFirst({
      where: { id: id.trim(), tenantId },
    });
    if (!existing) throw new NotFoundException('SystemManual not found');

    const updated = await this.prisma.nx09SystemManual.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.steps !== undefined ? { steps: dto.steps } : {}),
        ...(dto.screenshots !== undefined ? { screenshots: dto.screenshots } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.version !== undefined ? { version: dto.version.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() ?? null } : {}),
        updatedBy: user.sub,
      },
    });
    return { ok: true, row: updated };
  }

  async delete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09SystemManual.findFirst({
      where: { id: id.trim(), tenantId },
      select: { id: true, featureKey: true, title: true },
    });
    if (!existing) throw new NotFoundException('SystemManual not found');

    await this.prisma.nx09SystemManual.delete({ where: { id: existing.id } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'DELETE',
      entityTable: 'nx09_system_manual',
      entityId: existing.id,
      entityCode: existing.featureKey,
      summary: `SystemManual 刪除：${existing.featureKey}`,
      beforeData: existing as object,
    });
    return { ok: true };
  }
}
