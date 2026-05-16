// apps/nx-api/src/nx03/conversion/conversion.service.ts
// NX03 Conversion service（重組 M / 分解 D 共用 service、Crown Q-Phase6-1=c 依 conversionType 分派）
// 對齊 overview §3.3 #9 重組 source=M / #10 分解 source=D
//
// 過帳邏輯：
//   M 重組：inputs (N) 各走 applyQtyOutWithLedger source=M
//           output (1) 走 applyQtyInWithLedger source=M、unitCost = Σ (input.unitCost × input.qty)（Q-M4-1=a 加權）
//   D 分解：input (1) 走 applyQtyOutWithLedger source=D
//           outputs (N) 各走 applyQtyInWithLedger source=D、unitCost = input.totalCost × priceA_x / Σ priceA（Q-B2=priceA）
//           costRatio 人工指定可 override（commit 2 實作）
//
// 本檔 commit 1：M 路徑完整、D 路徑 throw 'not implemented'（commit 2 補）

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
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { applyQtyInWithLedger, applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import {
  assertConversionStatusTransition,
  ConversionStatus,
} from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateConversionDto,
  CreateConversionInputDto,
  CreateConversionOutputDto,
  UpdateConversionDto,
} from './dto/conversion.dto';

const CV_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  conversionDate: true,
  conversionType: true,
  status: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  postedAt: true,
  postedBy: true,
  voidedAt: true,
  voidedBy: true,
} as const;

const CV_INPUT_SEL = {
  id: true,
  conversionId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  partVersionId: true,
  locationId: true,
  qty: true,
  unitCost: true,
  totalCost: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const CV_OUTPUT_SEL = {
  id: true,
  conversionId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  partVersionId: true,
  locationId: true,
  qty: true,
  unitCost: true,
  totalCost: true,
  costRatio: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class ConversionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03ConversionWhereInput {
    const where: Prisma.Nx03ConversionWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  private async loadActivePartVersionId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
  ): Promise<string | null> {
    const v = await tx.nx01PartVersion.findFirst({
      where: { tenantId, partId, effectiveTo: null },
      orderBy: { versionNo: 'desc' },
      select: { id: true },
    });
    return v?.id ?? null;
  }

  private async resolveUnitCost(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    partId: string,
  ): Promise<PrismaNs.Decimal> {
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, warehouseId, partId },
      select: { avgCost: true },
    });
    if (!bal) return new PrismaNs.Decimal(0);
    return new PrismaNs.Decimal(bal.avgCost);
  }

  /**
   * conversionType invariant 校驗：
   *   M 重組：inputs ≥ 1、outputs === 1
   *   D 分解：inputs === 1、outputs ≥ 1
   */
  private assertConversionInvariant(
    conversionType: 'M' | 'D',
    inputs: CreateConversionInputDto[],
    outputs: CreateConversionOutputDto[],
  ) {
    if (conversionType === 'M') {
      if (outputs.length !== 1) {
        throw new BadRequestException('conversionType=M 重組: outputs 必須 == 1 row');
      }
      // costRatio 在 M 必空
      for (const o of outputs) {
        if (o.costRatio != null) {
          throw new BadRequestException('conversionType=M 重組: outputs[].costRatio 必空（output 唯一、unitCost auto 算）');
        }
      }
    } else {
      if (inputs.length !== 1) {
        throw new BadRequestException('conversionType=D 分解: inputs 必須 == 1 row');
      }
    }
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Conversion.count({ where }),
      this.prisma.nx03Conversion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: CV_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Conversion.findFirst({
      where: { id, tenantId },
      select: {
        ...CV_SEL,
        inputs: { orderBy: { lineNo: 'asc' }, select: CV_INPUT_SEL },
        outputs: { orderBy: { lineNo: 'asc' }, select: CV_OUTPUT_SEL },
      },
    });
    if (!row) throw new NotFoundException('Conversion not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateConversionDto) {
    const tenantId = requireTenantId(user);
    this.assertConversionInvariant(dto.conversionType, dto.inputs, dto.outputs);

    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'CV', wh.code);
      const cv = await tx.nx03Conversion.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          conversionDate: new Date(dto.conversionDate),
          conversionType: dto.conversionType,
          status: ConversionStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: CV_SEL,
      });
      // inputs
      let inLine = 1;
      for (const it of dto.inputs) {
        await this.createInputTx(tx, user, cv.id, tenantId, wh.id, inLine++, it);
      }
      // outputs
      let outLine = 1;
      for (const it of dto.outputs) {
        await this.createOutputTx(tx, user, cv.id, tenantId, wh.id, outLine++, it);
      }
      const full = await tx.nx03Conversion.findFirst({
        where: { id: cv.id },
        select: {
          ...CV_SEL,
          inputs: { orderBy: { lineNo: 'asc' }, select: CV_INPUT_SEL },
          outputs: { orderBy: { lineNo: 'asc' }, select: CV_OUTPUT_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_conversion',
        entityId: cv.id,
        entityCode: cv.docNo,
        summary: `建立轉換單（type=${dto.conversionType} ${dto.conversionType === 'M' ? '重組' : '分解'}）`,
        afterData: full as object,
      });
      return full;
    });
  }

  private async createInputTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    conversionId: string,
    tenantId: string,
    warehouseId: string,
    lineNo: number,
    it: CreateConversionInputDto,
  ) {
    const loc = await tx.nx01Location.findFirst({
      where: { id: it.locationId.trim(), tenantId, warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException(`input.locationId must belong to header warehouse (line ${lineNo})`);
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const partVersionId = await this.loadActivePartVersionId(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    // unitCost DRAFT 階段先抓 avgCost、過帳時若 drift 重新抓
    const unitCost =
      it.unitCost != null
        ? new PrismaNs.Decimal(it.unitCost)
        : await this.resolveUnitCost(tx, tenantId, warehouseId, it.partId.trim());
    await tx.nx03ConversionInput.create({
      data: {
        conversionId,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        partVersionId,
        locationId: it.locationId.trim(),
        qty,
        unitCost,
        totalCost: qty.mul(unitCost).toDecimalPlaces(2),
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  private async createOutputTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    conversionId: string,
    tenantId: string,
    warehouseId: string,
    lineNo: number,
    it: CreateConversionOutputDto,
  ) {
    const loc = await tx.nx01Location.findFirst({
      where: { id: it.locationId.trim(), tenantId, warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException(`output.locationId must belong to header warehouse (line ${lineNo})`);
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const partVersionId = await this.loadActivePartVersionId(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    await tx.nx03ConversionOutput.create({
      data: {
        conversionId,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        partVersionId,
        locationId: it.locationId.trim(),
        qty,
        // unitCost / totalCost DRAFT 階段留 0、過帳時算
        unitCost: new PrismaNs.Decimal(0),
        totalCost: new PrismaNs.Decimal(0),
        costRatio: it.costRatio != null ? new PrismaNs.Decimal(it.costRatio) : null,
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  /**
   * 過帳：依 conversionType 分派
   *   M 重組：mergePosting
   *   D 分解：disassemblePosting（Crown Q-B2=priceA + costRatio override）
   */
  private async applyConversionPosting(
    tx: Prisma.TransactionClient,
    cv: Prisma.Nx03ConversionGetPayload<{ select: typeof CV_SEL }>,
    userId: string,
  ) {
    if (cv.conversionType === 'M') {
      await this.applyMergePosting(tx, cv, userId);
    } else if (cv.conversionType === 'D') {
      await this.applyDisassemblePosting(tx, cv, userId);
    } else {
      throw new BadRequestException(`Unknown conversionType: ${cv.conversionType}`);
    }
  }

  /**
   * 分解 D 過帳（Crown Q-B2=priceA + costRatio override）：
   *   input (1) → applyQtyOutWithLedger source=D（helper 用 avgCost）
   *   inputTotalCost = input.qty × current avgCost（再 fetch 一次確保 fresh）
   *   outputs (N) unitCost 計算：
   *     - 全 costRatio 非 null：manual mode、unitCost = inputTotalCost × costRatio / output.qty
   *       （Σ costRatio 必須 = 1.0、容差 0.000001）
   *     - 全 costRatio null：auto mode、用 part.priceA 比例
   *       weight_i = output_i.priceA × output_i.qty
   *       unitCost_i = inputTotalCost × weight_i / Σ weight / output_i.qty
   *     - mixed：throw（要嘛全 manual 要嘛全 auto）
   *   outputs 各走 applyQtyInWithLedger source=D
   *   partVersionId 帶入兩面（M1 配套）
   */
  private async applyDisassemblePosting(
    tx: Prisma.TransactionClient,
    cv: Prisma.Nx03ConversionGetPayload<{ select: typeof CV_SEL }>,
    userId: string,
  ) {
    const inputs = await tx.nx03ConversionInput.findMany({
      where: { conversionId: cv.id },
      select: { ...CV_INPUT_SEL },
    });
    if (inputs.length !== 1) {
      throw new BadRequestException(`Disassemble inputs must be 1 row, got ${inputs.length}`);
    }
    const input = inputs[0];

    const outputs = await tx.nx03ConversionOutput.findMany({
      where: { conversionId: cv.id },
      select: { ...CV_OUTPUT_SEL },
    });
    if (!outputs.length) throw new BadRequestException('Disassemble has no outputs');

    // Step 1: input 出庫（helper 用 avgCost）+ 計算 inputTotalCost
    const inQty = new PrismaNs.Decimal(input.qty);
    if (inQty.lte(0)) throw new BadRequestException('Disassemble input qty must be > 0');
    const inputUnitCost = await this.resolveUnitCost(tx, cv.tenantId, cv.warehouseId, input.partId);
    const inputTotalCost = inQty.mul(inputUnitCost);

    await applyQtyOutWithLedger(tx, {
      tenantId: cv.tenantId,
      userId,
      partId: input.partId,
      warehouseId: cv.warehouseId,
      locationId: input.locationId,
      qtyOut: inQty,
      sourceModule: 'NX03',
      sourceDocType: 'D',
      sourceDocId: cv.id,
      sourceItemId: input.id,
      partVersionId: input.partVersionId,
    });
    await tx.nx03ConversionInput.update({
      where: { id: input.id },
      data: {
        unitCost: inputUnitCost,
        totalCost: inputTotalCost.toDecimalPlaces(2),
        updatedBy: userId,
      },
    });

    // Step 2: 判斷 cost mode（manual / auto / mixed）
    const allManual = outputs.every((o) => o.costRatio != null);
    const allAuto = outputs.every((o) => o.costRatio == null);
    if (!allManual && !allAuto) {
      throw new BadRequestException(
        'Disassemble outputs costRatio must be all-manual or all-auto (mixed mode not allowed)',
      );
    }

    // Step 3: 計算每 output 的 allocatedCost
    let weights: PrismaNs.Decimal[] = [];
    let totalWeight = new PrismaNs.Decimal(0);

    if (allManual) {
      // manual: weight = costRatio、Σ 必須 ≈ 1.0
      weights = outputs.map((o) => new PrismaNs.Decimal(o.costRatio!));
      totalWeight = weights.reduce((acc, w) => acc.add(w), new PrismaNs.Decimal(0));
      const epsilon = new PrismaNs.Decimal('0.000001');
      if (totalWeight.sub(1).abs().gt(epsilon)) {
        throw new BadRequestException(
          `Disassemble manual mode: Σ costRatio must equal 1.0 (got ${totalWeight.toString()})`,
        );
      }
    } else {
      // auto: weight = part.priceA × output.qty
      for (const o of outputs) {
        const part = await tx.nx01Part.findFirst({
          where: { id: o.partId, tenantId: cv.tenantId },
          select: { priceA: true },
        });
        const priceA = part?.priceA ? new PrismaNs.Decimal(part.priceA) : new PrismaNs.Decimal(0);
        const w = priceA.mul(new PrismaNs.Decimal(o.qty));
        weights.push(w);
        totalWeight = totalWeight.add(w);
      }
      if (totalWeight.lte(0)) {
        throw new BadRequestException(
          'Disassemble auto mode: Σ (priceA × qty) must be > 0、所有 output part.priceA 必須非 0',
        );
      }
    }

    // Step 4: outputs 入庫
    for (let i = 0; i < outputs.length; i++) {
      const o = outputs[i];
      const outQty = new PrismaNs.Decimal(o.qty);
      if (outQty.lte(0)) continue;
      const w = weights[i];
      const allocatedCost = allManual
        ? inputTotalCost.mul(w) // manual: ratio 直接 × totalCost
        : inputTotalCost.mul(w).div(totalWeight); // auto: 加權
      const outUnitCost = allocatedCost.div(outQty).toDecimalPlaces(4);
      const outTotalCost = allocatedCost.toDecimalPlaces(2);

      await applyQtyInWithLedger(tx, {
        tenantId: cv.tenantId,
        userId,
        partId: o.partId,
        warehouseId: cv.warehouseId,
        locationId: o.locationId,
        qtyIn: outQty,
        unitCost: outUnitCost,
        sourceModule: 'NX03',
        sourceDocType: 'D',
        sourceDocId: cv.id,
        sourceItemId: o.id,
        partVersionId: o.partVersionId,
      });
      await tx.nx03ConversionOutput.update({
        where: { id: o.id },
        data: {
          unitCost: outUnitCost,
          totalCost: outTotalCost,
          updatedBy: userId,
        },
      });
    }
  }

  /**
   * 重組 M 過帳：
   *   inputs (N) 各走 applyQtyOutWithLedger source=M（helper 用 avgCost 為 unitCost）
   *   output (1) unitCost = Σ (input.unitCost × input.qty) = Σ input.totalCost（Q-M4-1=a 加權）
   *   output 走 applyQtyInWithLedger source=M
   *   partVersionId 帶入（M1 配套）
   */
  private async applyMergePosting(
    tx: Prisma.TransactionClient,
    cv: Prisma.Nx03ConversionGetPayload<{ select: typeof CV_SEL }>,
    userId: string,
  ) {
    const inputs = await tx.nx03ConversionInput.findMany({
      where: { conversionId: cv.id },
      select: { ...CV_INPUT_SEL },
    });
    if (!inputs.length) throw new BadRequestException('Merge conversion has no inputs to post');

    const outputs = await tx.nx03ConversionOutput.findMany({
      where: { conversionId: cv.id },
      select: { ...CV_OUTPUT_SEL },
    });
    if (outputs.length !== 1) {
      throw new BadRequestException(`Merge conversion outputs must be 1 row, got ${outputs.length}`);
    }
    const output = outputs[0];

    // Step 1: inputs 出庫（helper 內部抓 avgCost）+ 累計加權 totalCost
    let totalInputCost = new PrismaNs.Decimal(0);
    for (const input of inputs) {
      const qtyOut = new PrismaNs.Decimal(input.qty);
      if (qtyOut.lte(0)) continue;
      // helper 走 avgCost、不傳 unitCost；我們需要在 helper 寫完後 query balance 取 unitCost 累計
      // 為了避免 helper 內部隱藏成本、我們先抓 avgCost 為當下成本參考
      const currentUnitCost = await this.resolveUnitCost(tx, cv.tenantId, cv.warehouseId, input.partId);
      totalInputCost = totalInputCost.add(qtyOut.mul(currentUnitCost));
      await applyQtyOutWithLedger(tx, {
        tenantId: cv.tenantId,
        userId,
        partId: input.partId,
        warehouseId: cv.warehouseId,
        locationId: input.locationId,
        qtyOut,
        sourceModule: 'NX03',
        sourceDocType: 'M',
        sourceDocId: cv.id,
        sourceItemId: input.id,
        partVersionId: input.partVersionId,
      });
      // 更新 input.unitCost / totalCost（記錄過帳時實際使用的成本）
      await tx.nx03ConversionInput.update({
        where: { id: input.id },
        data: {
          unitCost: currentUnitCost,
          totalCost: qtyOut.mul(currentUnitCost).toDecimalPlaces(2),
          updatedBy: userId,
        },
      });
    }

    // Step 2: output 入庫、unitCost = totalInputCost / output.qty（加權平均給單一輸出）
    const outQty = new PrismaNs.Decimal(output.qty);
    if (outQty.lte(0)) throw new BadRequestException('Merge conversion output qty must be > 0');
    const outUnitCost = totalInputCost.div(outQty).toDecimalPlaces(4);
    const outTotalCost = totalInputCost.toDecimalPlaces(2);

    await applyQtyInWithLedger(tx, {
      tenantId: cv.tenantId,
      userId,
      partId: output.partId,
      warehouseId: cv.warehouseId,
      locationId: output.locationId,
      qtyIn: outQty,
      unitCost: outUnitCost,
      sourceModule: 'NX03',
      sourceDocType: 'M',
      sourceDocId: cv.id,
      sourceItemId: output.id,
      partVersionId: output.partVersionId,
    });
    await tx.nx03ConversionOutput.update({
      where: { id: output.id },
      data: {
        unitCost: outUnitCost,
        totalCost: outTotalCost,
        updatedBy: userId,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateConversionDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Conversion.findFirst({
      where: { id, tenantId },
      select: CV_SEL,
    });
    if (!existing) throw new NotFoundException('Conversion not found');
    if (existing.voidedAt) throw new BadRequestException('Conversion is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertConversionStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === ConversionStatus.POSTED && existing.status === ConversionStatus.DRAFT) {
        const head = await tx.nx03Conversion.findFirst({ where: { id, tenantId }, select: CV_SEL });
        if (!head) throw new NotFoundException('Conversion not found');
        await this.applyConversionPosting(tx, head, user.sub);
        await tx.nx03Conversion.update({
          where: { id },
          data: {
            status: ConversionStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.conversionDate !== undefined ? { conversionDate: new Date(dto.conversionDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx03Conversion.update({
          where: { id },
          data: {
            ...(dto.conversionDate !== undefined ? { conversionDate: new Date(dto.conversionDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Conversion.findFirst({
        where: { id },
        select: {
          ...CV_SEL,
          inputs: { orderBy: { lineNo: 'asc' }, select: CV_INPUT_SEL },
          outputs: { orderBy: { lineNo: 'asc' }, select: CV_OUTPUT_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === ConversionStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_conversion',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === ConversionStatus.POSTED ? '轉換過帳' : '修改轉換單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return full;
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Conversion.findFirst({
      where: { id, tenantId },
      select: CV_SEL,
    });
    if (!existing) throw new NotFoundException('Conversion not found');
    if (existing.voidedAt) throw new BadRequestException('Already voided');
    if (existing.status === ConversionStatus.POSTED) {
      throw new BadRequestException('Cannot void posted conversion');
    }
    assertConversionStatusTransition(existing.status, ConversionStatus.VOIDED);
    await this.prisma.nx03Conversion.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedBy: user.sub,
        status: ConversionStatus.VOIDED,
        updatedBy: user.sub,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_conversion',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢轉換單',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}
