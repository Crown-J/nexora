// apps/nx-api/src/nx04/issue-report/issue-report.service.ts
// NX04-M2 §A C6：跨單據問題回報入口 service
//
// 業務語意（Crown 2026-05-29 §A C6 拍板）：
//   - QT / SO / SR detail 右上「問題回報」按鈕共用入口
//   - 寫 Nx03IssueReport（sourceModule='NX04' 自動帶、不重做 IssueReport 表）
//   - 驗 sourceDoc 存在於該 tenant、partId 存在
//   - issueType='L' 放錯庫位 → locationId 必填
//   - dispositionType 預設 'N' 未處置（看 IssueReport 工作台後續處置）

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateNx04IssueReportDto } from './dto/issue-report.dto';

@Injectable()
export class Nx04IssueReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private async assertSourceDoc(
    tx: Prisma.TransactionClient,
    tenantId: string,
    sourceDocType: 'QT' | 'SO' | 'SR',
    sourceDocId: string,
  ): Promise<{ docNo: string }> {
    if (sourceDocType === 'QT') {
      const q = await tx.nx04Quote.findFirst({
        where: { id: sourceDocId, tenantId },
        select: { docNo: true },
      });
      if (!q) throw new NotFoundException(`QT ${sourceDocId} not found`);
      return q;
    }
    if (sourceDocType === 'SO') {
      const s = await tx.nx04So.findFirst({
        where: { id: sourceDocId, tenantId },
        select: { docNo: true },
      });
      if (!s) throw new NotFoundException(`SO ${sourceDocId} not found`);
      return s;
    }
    const r = await tx.nx04Sr.findFirst({
      where: { id: sourceDocId, tenantId },
      select: { docNo: true },
    });
    if (!r) throw new NotFoundException(`SR ${sourceDocId} not found`);
    return r;
  }

  async create(user: RequestUser, dto: CreateNx04IssueReportDto) {
    const tenantId = requireTenantId(user);

    if (dto.issueType === 'L' && !dto.locationId?.trim()) {
      throw new BadRequestException("locationId is required when issueType='L' (放錯庫位)");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 驗 sourceDoc 存在
      const src = await this.assertSourceDoc(
        tx,
        tenantId,
        dto.sourceDocType,
        dto.sourceDocId.trim(),
      );

      // 2. 驗 partId 存在 + 取 snapshot
      const part = await tx.nx01Part.findFirst({
        where: { id: dto.partId.trim(), tenantId },
        select: { code: true, name: true },
      });
      if (!part) throw new NotFoundException(`Part ${dto.partId} not found`);

      // 3. 驗 warehouseId 存在 + 取 code 用 docNo
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');

      // 4. 驗 locationId（如果有提供）必須屬於該 warehouse
      if (dto.locationId?.trim()) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: dto.locationId.trim(), tenantId, warehouseId: dto.warehouseId.trim() },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId must belong to warehouse');
      }

      // 5. 取 active part_version snapshot（NX01-17 範式）
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId, partId: dto.partId.trim(), effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });

      // 6. 產生 docNo + 寫 IssueReport
      const docNo = await allocNx03DocNo(tx, tenantId, 'IR', wh.code);
      const row = await tx.nx03IssueReport.create({
        data: {
          tenantId,
          docNo,
          reportDate: new Date(),
          warehouseId: dto.warehouseId.trim(),
          locationId: dto.locationId?.trim() || null,
          partId: dto.partId.trim(),
          partNo: part.code,
          partName: part.name,
          partVersionId: partVersion?.id ?? null,
          qty: new PrismaNs.Decimal(dto.qty),
          issueType: dto.issueType,
          dispositionType: dto.dispositionType ?? 'N',
          sourceModule: 'NX04',
          sourceDocType: dto.sourceDocType,
          sourceDocId: dto.sourceDocId.trim(),
          status: 'REPORTED',
          description: dto.description?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: {
          id: true,
          docNo: true,
          sourceModule: true,
          sourceDocType: true,
          sourceDocId: true,
          issueType: true,
          dispositionType: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          warehouseId: true,
          locationId: true,
          status: true,
          description: true,
          reportDate: true,
          createdAt: true,
          createdBy: true,
        },
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx03_issue_report',
        entityId: row.id,
        entityCode: row.docNo,
        summary: `跨單據問題回報：${dto.sourceDocType} ${src.docNo} → ${row.docNo}（issueType=${dto.issueType}）`,
        afterData: row as object,
      });

      return row;
    });
  }
}
