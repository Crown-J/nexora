// apps/nx-api/src/nx03/issue-report/issue-report.service.ts
// NX03-STOCK-LITE M2-C：異常回報跨模組共用 service
//
// 狀態流轉（線性、不可回退）：
//   DRAFT → REPORTED（report 動作、向倉管 / 主管出聲）
//   REPORTED → PROCESSING（dispose 動作、選 5 處置之一 + 關聯單據）
//   PROCESSING → CLOSED（close 動作、處置完成）
//   任何階段 → CANCELLED（cancel 動作、誤報 / 撤銷）
//
// 5 處置（dispositionType）軟連結（relatedDocId）：
//   R=Return 退貨 → Nx02Rr
//   W=Warranty 保固 → Nx02WarrantyClaim
//   C=Conversion 重組分解 → Nx03Conversion
//   D=Disposal 報廢 → Nx03Disposal
//   N=None 未處置
//
// 跨模組來源（sourceModule + sourceDocType + sourceDocId）：庫存/銷貨/檢貨等模組可建單寫入。

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CloseIssueReportDto,
  CreateIssueReportDto,
  DispositionType,
  DisposeIssueReportDto,
  ListIssueReportQueryDto,
  UpdateIssueReportDto,
} from './dto/issue-report.dto';

const IR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  reportDate: true,
  warehouseId: true,
  locationId: true,
  partId: true,
  partNo: true,
  partName: true,
  partVersionId: true,
  qty: true,
  issueType: true,
  dispositionType: true,
  relatedDocId: true,
  sourceModule: true,
  sourceDocType: true,
  sourceDocId: true,
  status: true,
  description: true,
  photoUrl: true,
  closedAt: true,
  closedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const STATUS_EDGES: Record<string, Set<string>> = {
  DRAFT: new Set(['REPORTED', 'CANCELLED']),
  REPORTED: new Set(['PROCESSING', 'CANCELLED']),
  PROCESSING: new Set(['CLOSED', 'CANCELLED']),
  CLOSED: new Set(),
  CANCELLED: new Set(),
};

function assertStatusTransition(from: string, to: string): void {
  const edges = STATUS_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid issue-report status transition: ${from} -> ${to}`);
  }
}

@Injectable()
export class IssueReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListIssueReportQueryDto): Prisma.Nx03IssueReportWhereInput {
    const where: Prisma.Nx03IssueReportWhereInput = { tenantId };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.issueType) where.issueType = q.issueType;
    if (q.dispositionType) where.dispositionType = q.dispositionType;
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.sourceModule?.trim()) where.sourceModule = q.sourceModule.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { partNo: { contains: s, mode: 'insensitive' } },
        { partName: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(user: RequestUser, q: ListIssueReportQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03IssueReport.count({ where }),
      this.prisma.nx03IssueReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...IR_SEL,
          warehouse: { select: { code: true, name: true } },
          location: { select: { code: true, name: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03IssueReport.findFirst({
      where: { id, tenantId },
      select: {
        ...IR_SEL,
        warehouse: { select: { code: true, name: true } },
        location: { select: { code: true, name: true } },
        part: { select: { code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('IssueReport not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateIssueReportDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');

      // L=放錯庫位 → locationId 必填、application-layer 自律
      if (dto.issueType === 'L' && !dto.locationId?.trim()) {
        throw new BadRequestException('issueType=L 放錯庫位、locationId 必填');
      }
      if (dto.locationId?.trim()) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: dto.locationId.trim(), tenantId, warehouseId: wh.id },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId 必須屬於 warehouseId 同倉');
      }

      const part = await tx.nx01Part.findFirst({
        where: { id: dto.partId.trim(), tenantId },
        select: { id: true, code: true, name: true },
      });
      if (!part) throw new BadRequestException('partId invalid');
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId, partId: part.id, effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });

      const docNo = await allocNx03DocNo(tx, tenantId, 'IR', wh.code);

      const row = await tx.nx03IssueReport.create({
        data: {
          tenantId,
          docNo,
          reportDate: new Date(dto.reportDate),
          warehouseId: wh.id,
          locationId: dto.locationId?.trim() || null,
          partId: part.id,
          partNo: part.code,
          partName: part.name,
          partVersionId: partVersion?.id ?? null,
          qty: new PrismaNs.Decimal(dto.qty),
          issueType: dto.issueType,
          dispositionType: 'N',
          status: 'DRAFT',
          description: dto.description?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
          sourceModule: dto.sourceModule?.trim() || null,
          sourceDocType: dto.sourceDocType?.trim() || null,
          sourceDocId: dto.sourceDocId?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: IR_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_issue_report',
        entityId: row.id,
        entityCode: row.docNo,
        summary: `建立異常回報（type=${dto.issueType}、qty=${dto.qty}）`,
        afterData: row as object,
      });

      return row;
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateIssueReportDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03IssueReport.findFirst({
      where: { id, tenantId },
      select: IR_SEL,
    });
    if (!existing) throw new NotFoundException('IssueReport not found');
    if (existing.status !== 'DRAFT' && existing.status !== 'REPORTED') {
      throw new BadRequestException(`update 只允許在 DRAFT/REPORTED 階段（current: ${existing.status}）`);
    }

    // 若改 locationId、需屬同倉
    if (dto.locationId?.trim()) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: existing.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId 必須屬於同倉');
    }

    const row = await this.prisma.nx03IssueReport.update({
      where: { id },
      data: {
        ...(dto.reportDate !== undefined ? { reportDate: new Date(dto.reportDate) } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() || null } : {}),
        ...(dto.qty !== undefined ? { qty: new PrismaNs.Decimal(dto.qty) } : {}),
        ...(dto.issueType !== undefined ? { issueType: dto.issueType } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl?.trim() || null } : {}),
        updatedBy: user.sub,
      },
      select: IR_SEL,
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_issue_report',
      entityId: id,
      entityCode: existing.docNo,
      summary: '修改異常回報',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  /** DRAFT → REPORTED（提交、向倉管 / 主管出聲） */
  async report(user: RequestUser, id: string) {
    return this.transition(user, id, 'REPORTED', '提交異常回報');
  }

  /** REPORTED → PROCESSING：選處置 5 之 1 + 關聯單據 ID */
  async dispose(user: RequestUser, id: string, dto: DisposeIssueReportDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03IssueReport.findFirst({
      where: { id, tenantId },
      select: IR_SEL,
    });
    if (!existing) throw new NotFoundException('IssueReport not found');
    if (existing.status !== 'REPORTED') {
      throw new BadRequestException(`dispose 需在 REPORTED 階段（current: ${existing.status}）`);
    }
    assertStatusTransition(existing.status, 'PROCESSING');

    const disp: DispositionType = dto.dispositionType;
    const related = dto.relatedDocId?.trim() || null;
    // ⚠️ M2 不強制 relatedDocId（M3 UI 可先建處置單再回 patch）；只 N 處置不需要 ID、其他建議要
    // 若 relatedDocId 為空且 disposition ≠ 'N'：仍允許（軟連結、UI 可後續補）

    const row = await this.prisma.nx03IssueReport.update({
      where: { id },
      data: {
        dispositionType: disp,
        relatedDocId: related,
        status: 'PROCESSING',
        updatedBy: user.sub,
      },
      select: IR_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_issue_report',
      entityId: id,
      entityCode: existing.docNo,
      summary: `處置分流 → ${this.describeDisposition(disp)}${related ? `（doc=${related}）` : ''}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  /** PROCESSING → CLOSED：結案、可帶 remark（覆蓋 description？ 不，存在 description） */
  async close(user: RequestUser, id: string, dto: CloseIssueReportDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03IssueReport.findFirst({
      where: { id, tenantId },
      select: IR_SEL,
    });
    if (!existing) throw new NotFoundException('IssueReport not found');
    if (existing.status !== 'PROCESSING') {
      throw new BadRequestException(`close 需在 PROCESSING 階段（current: ${existing.status}）`);
    }
    assertStatusTransition(existing.status, 'CLOSED');
    const now = new Date();
    const row = await this.prisma.nx03IssueReport.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        closedBy: user.sub,
        ...(dto.remark?.trim()
          ? {
              description: existing.description
                ? `${existing.description}\n\n[結案備註] ${dto.remark.trim()}`
                : `[結案備註] ${dto.remark.trim()}`,
            }
          : {}),
        updatedBy: user.sub,
      },
      select: IR_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_issue_report',
      entityId: id,
      entityCode: existing.docNo,
      summary: '結案異常回報',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  /** 任意階段 → CANCELLED（誤報、撤銷） */
  async cancel(user: RequestUser, id: string) {
    return this.transition(user, id, 'CANCELLED', '作廢異常回報');
  }

  private async transition(user: RequestUser, id: string, to: string, summary: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03IssueReport.findFirst({
      where: { id, tenantId },
      select: IR_SEL,
    });
    if (!existing) throw new NotFoundException('IssueReport not found');
    assertStatusTransition(existing.status, to);
    const row = await this.prisma.nx03IssueReport.update({
      where: { id },
      data: { status: to, updatedBy: user.sub },
      select: IR_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: to === 'CANCELLED' ? 'DELETE' : 'UPDATE',
      entityTable: 'nx03_issue_report',
      entityId: id,
      entityCode: existing.docNo,
      summary,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  private describeDisposition(d: DispositionType): string {
    switch (d) {
      case 'R':
        return '退貨';
      case 'W':
        return '保固';
      case 'C':
        return '重組分解';
      case 'D':
        return '報廢';
      case 'N':
      default:
        return '未處置';
    }
  }
}
