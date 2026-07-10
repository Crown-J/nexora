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
import { PurchaseReturnService } from '../../nx02/purchase-return/purchase-return.service';
import { WarrantyClaimService } from '../../nx02/warranty-claim/warranty-claim.service';
import { SoService } from '../../nx04/so/so.service';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { requireDefaultLocationId } from '../../shared/nx04/nx04-location';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { DisposalService } from '../disposal/disposal.service';

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
    // F1 特價售出 2026-06-08：dispose('X') 自動建特價 SO 用、走 SoService 完整 create flow
    private readonly so: SoService,
    // W5 異常鏈 Step 3 2026-07-11：dispose 一鍵開單（R 退貨 / W 保固 / D 報廢）、走各 service 完整 create flow
    private readonly purchaseReturn: PurchaseReturnService,
    private readonly warrantyClaim: WarrantyClaimService,
    private readonly disposal: DisposalService,
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
    // W5 異常鏈 Step 4：單據外殼列表需建單人員名（批次查 user、對齊 RrService.list 範式）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({ where: { id: { in: creatorIds } }, select: { id: true, userName: true } })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c.userName]));
    const items = rows.map((r) => ({ ...r, createdByName: creatorMap.get(r.createdBy) ?? null }));
    return { page, pageSize, total, items };
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

  /** REPORTED → PROCESSING：選處置 6 之 1 + 關聯單據 ID */
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
    let related = dto.relatedDocId?.trim() || null;
    // ⚠️ M2 不強制 relatedDocId（M3 UI 可先建處置單再回 patch）；只 N 處置不需要 ID、其他建議要
    // 若 relatedDocId 為空且 disposition ≠ 'N'：仍允許（軟連結、UI 可後續補）

    // F1 特價售出 2026-06-08：dispositionType='X' 且未帶 relatedDocId → 自動建特價 SO
    // 業務語意：成本 avgCost / 售價=特價（業務手動填）/ 走一般銷貨應收（不走折讓）
    // 三必要欄位：customerId / warehouseId（預設取 IR.warehouseId） / unitPrice
    if (disp === 'X' && !related) {
      if (!dto.customerId?.trim()) {
        throw new BadRequestException('特價售出（X）必填 customerId（指定買家）');
      }
      if (dto.unitPrice == null || dto.unitPrice < 0) {
        throw new BadRequestException('特價售出（X）必填 unitPrice ≥ 0（業務填特價）');
      }
      const whId = dto.warehouseId?.trim() || existing.warehouseId;
      // F1：呼叫 SoService.create 走完整建單 flow（含 docNo / paymentTerm / invoiceCopies 帶入）
      // type assertion 因 SoService.create 返 mapDetail Record<string, unknown>、id 在 runtime 有
      const soResult = await this.so.create(user, {
        warehouseId: whId,
        soDate: new Date().toISOString().slice(0, 10),
        customerId: dto.customerId.trim(),
        deliveryType: 'P', // 自取為預設（異常品通常現買現帶、業務可建單後改）
        taxRate: 5,
        specialPriceFlag: true,
        remark: `異常處置 X 特價售出（來源 IR ${existing.docNo}）`,
        items: [
          {
            partId: existing.partId,
            warehouseId: whId,
            qty: Number(existing.qty),
            unitPriceSnapshot: dto.unitPrice,
          },
        ],
      });
      const soId = (soResult as unknown as { id: string }).id;
      related = soId;
    }

    // W5 異常鏈 Step 3 2026-07-11：一鍵開單（autoCreate=true 且未帶 relatedDocId、R/W/C/D）
    // 各 service create 自帶 $transaction；建單失敗直接 throw、IR 停留 REPORTED 不進 PROCESSING
    if (!related && dto.autoCreate && (disp === 'R' || disp === 'W' || disp === 'C' || disp === 'D')) {
      related = await this.autoCreateDispositionDoc(user, tenantId, existing, disp);
    }

    // W5 異常鏈 Step 3：處置單回填 sourceIssueReportId（一鍵開單與手動連結同路、供處置完成回寫 IR 結案）
    // X 特價 SO 無此欄跳過；手動連結查無單據 throw（防手滑亂填、dispose 僅發生一次無歷史相容問題）
    if (related && (disp === 'R' || disp === 'W' || disp === 'C' || disp === 'D')) {
      await this.stampDispositionDoc(user, tenantId, disp, related, existing.id);
    }

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

  /**
   * W5 異常鏈 Step 3 2026-07-11：dispose 一鍵開單。
   * - D 報廢：IR 資料直建 Disposal DRAFT（issueType D 損毀→A 損壞 / E 過期→B 過期 / 其他→D 其他）
   *   庫位：IR.locationId、沒有就取該倉預設庫位（報廢明細庫位必填）
   * - R 退貨 / W 保固：僅支援進貨驗收來源（sourceModule=NX02 + sourceDocType=RR、relatedDocId 存原 rrItem id）、
   *   供應商 / 成本 / 退貨原因都從原進貨明細帶；其他來源缺這些資料 → 提示手動建單後連結（拍板 2026-07-11 設計點 3）
   * - C 重組分解：outputs 需人工定義、不支援一鍵開單
   * 回傳新單 id（呼叫端回填 relatedDocId + 蓋 sourceIssueReportId）
   */
  private async autoCreateDispositionDoc(
    user: RequestUser,
    tenantId: string,
    ir: Prisma.Nx03IssueReportGetPayload<{ select: typeof IR_SEL }>,
    disp: 'R' | 'W' | 'C' | 'D',
  ): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    if (disp === 'C') {
      throw new BadRequestException(
        '重組分解單的產出明細需人工定義、不支援一鍵開單；請先建重組分解單、再以 relatedDocId 連結',
      );
    }
    if (disp === 'D') {
      const locationId =
        ir.locationId ?? (await requireDefaultLocationId(this.prisma, tenantId, ir.warehouseId));
      const disposalReason: 'A' | 'B' | 'D' =
        ir.issueType === 'D' ? 'A' : ir.issueType === 'E' ? 'B' : 'D';
      const ds = await this.disposal.create(user, {
        warehouseId: ir.warehouseId,
        disposalDate: today,
        remark: `來自異常回報 ${ir.docNo}`,
        items: [
          {
            partId: ir.partId,
            locationId,
            qty: Number(ir.qty),
            disposalReason,
            ...(disposalReason === 'D' ? { disposalRemark: `異常回報 ${ir.docNo} 轉報廢` } : {}),
          },
        ],
      });
      return (ds as unknown as { id: string }).id;
    }
    // R / W：需原進貨明細（供應商 / 成本 / 退貨原因來源）
    if (ir.sourceModule !== 'NX02' || ir.sourceDocType !== 'RR' || !ir.relatedDocId) {
      throw new BadRequestException(
        `一鍵開${disp === 'R' ? '退貨' : '保固'}單僅支援進貨驗收來源的異常單（需原進貨明細）；請手動建單後以 relatedDocId 連結`,
      );
    }
    const rrItem = await this.prisma.nx02RrItem.findFirst({
      where: { id: ir.relatedDocId, rr: { tenantId } },
      select: {
        id: true,
        partId: true,
        locationId: true,
        unitCost: true,
        actualUnitCost: true,
        defectType: true,
        rr: { select: { id: true, supplierId: true, warehouseId: true } },
      },
    });
    if (!rrItem || rrItem.partId !== ir.partId) {
      throw new BadRequestException('異常單連結的原進貨明細不存在或料號不符、無法一鍵開單');
    }
    if (disp === 'R') {
      const actualUnitCost = Number(rrItem.actualUnitCost);
      const pr = await this.purchaseReturn.create(user, {
        prDate: today,
        warehouseId: rrItem.rr.warehouseId,
        supplierId: rrItem.rr.supplierId,
        rrId: rrItem.rr.id,
        returnMode: 'P',
        dispositionFlag: 'B',
        remark: `來自異常回報 ${ir.docNo}`,
        items: [
          {
            rrItemId: rrItem.id,
            partId: ir.partId,
            qty: Number(ir.qty),
            unitPriceSnapshot: actualUnitCost > 0 ? actualUnitCost : Number(rrItem.unitCost),
            locationId: rrItem.locationId,
            returnReason: ['D', 'F', 'W', 'O'].includes(rrItem.defectType ?? '')
              ? (rrItem.defectType as string)
              : 'O',
          },
        ],
      });
      return (pr as unknown as { id: string }).id;
    }
    // disp === 'W'
    const wc = await this.warrantyClaim.create(user, {
      claimType: 'SELF',
      supplierId: rrItem.rr.supplierId,
      partId: ir.partId,
      qty: Number(ir.qty),
      claimDate: today,
      issueDescription: ir.description?.trim() || `異常回報 ${ir.docNo}`,
      remark: `來自異常回報 ${ir.docNo}`,
    });
    return (wc as unknown as { id: string }).id;
  }

  /**
   * W5 異常鏈 Step 3：把 IR id 回填到處置單 sourceIssueReportId（一鍵開單 / 手動連結同路）。
   * 查無單據 throw（tenant 隔離下防手滑亂填；一鍵開單產物必存在、只有手動連結會踩到）。
   */
  private async stampDispositionDoc(
    user: RequestUser,
    tenantId: string,
    disp: 'R' | 'W' | 'C' | 'D',
    docId: string,
    issueReportId: string,
  ): Promise<void> {
    const data = { sourceIssueReportId: issueReportId, updatedBy: user.sub };
    let count = 0;
    if (disp === 'R') {
      count = (await this.prisma.nx02Pr.updateMany({ where: { id: docId, tenantId }, data })).count;
    } else if (disp === 'W') {
      count = (await this.prisma.nx02WarrantyClaim.updateMany({ where: { id: docId, tenantId }, data })).count;
    } else if (disp === 'C') {
      count = (await this.prisma.nx03Conversion.updateMany({ where: { id: docId, tenantId }, data })).count;
    } else {
      count = (await this.prisma.nx03Disposal.updateMany({ where: { id: docId, tenantId }, data })).count;
    }
    if (!count) {
      throw new BadRequestException(
        `relatedDocId ${docId} 不存在於對應處置單（${this.describeDisposition(disp)}）`,
      );
    }
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
      // F1 特價售出 2026-06-08：第 6 處置
      case 'X':
        return '特價售出';
      case 'N':
      default:
        return '未處置';
    }
  }
}
