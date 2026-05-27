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

import type { CreatePartDto, ListPartQueryDto, UpdatePartDto } from './dto/part.dto';

const SEL = {
  id: true,
  tenantId: true,
  codeRuleId: true,
  code: true,
  name: true,
  isOem: true,
  secCode: true,
  seg1: true,
  seg2: true,
  seg3: true,
  seg4: true,
  seg5: true,
  countryId: true,
  partBrandId: true,
  type: true,
  partGroupId: true,
  spec: true,
  uom: true,
  isActive: true,
  returnPolicy: true,
  warrantyMonths: true,
  priceA: true,
  priceB: true,
  priceC: true,
  priceD: true,
  priceUpdatedAt: true,
  priceUpdatedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01PartGetPayload<{ select: typeof SEL }>;

function trimOrNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t === '' ? null : t;
}

function decimalStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    return (v as { toString(): string }).toString();
  }
  return String(v);
}

@Injectable()
export class PartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /**
   * 規格 §3 / §5 + Crown Q5=A 拍板：
   *   業務必先建 brand_code_rule、part 建立時 codeRuleId 必填
   *   auto-vivify 已正式拿掉（hotfix 暫保留簽名相容、本軌正式清理）
   */
  private async resolveCodeRuleId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    codeRuleId: string | undefined,
  ): Promise<string> {
    if (!codeRuleId?.trim()) {
      throw new BadRequestException(
        'codeRuleId is required. 業務必先在 brand_code_rule 建規則、再建 part（Q5=A）',
      );
    }
    const r = await tx.nx01BrandCodeRule.findFirst({
      where: { id: codeRuleId.trim(), tenantId },
      select: { id: true },
    });
    if (!r) throw new NotFoundException('codeRuleId not found for tenant');
    return r.id;
  }

  /**
   * Crown Q9=C：UNK 為系統保留字、tenant 不可用作 partBrand.code / country.code。
   * service 端 guard：若 dto 傳入的 partBrandId / countryId 對應 row code === 'UNK'、拒絕。
   * （未來軌建議在 part-brand / country create 端也加 guard、本軌不跨範圍）
   */
  private async validateUnkReservedNotUsed(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partBrandId: string | null | undefined,
    countryId: string | null | undefined,
  ): Promise<void> {
    if (partBrandId?.trim()) {
      const pb = await tx.nx01PartBrand.findFirst({
        where: { id: partBrandId.trim(), tenantId },
        select: { code: true },
      });
      if (!pb) throw new NotFoundException('partBrandId not found for tenant');
      if (pb.code === 'UNK') {
        throw new BadRequestException('partBrand.code "UNK" 為系統保留字、不可作為 part 引用');
      }
    }
    if (countryId?.trim()) {
      const c = await tx.nx01Country.findUnique({
        where: { id: countryId.trim() },
        select: { code: true },
      });
      if (!c) throw new NotFoundException('countryId not found');
      if (c.code === 'UNK') {
        throw new BadRequestException('country.code "UNK" 為系統保留字、不可作為 part 引用');
      }
    }
  }

  /**
   * Crown Q7=B 拍板：part.code 拼接邏輯走後端 service（業務集中、一致性）
   * Crown 業界 muscle memory：
   *   - 雨刷案例 BOSCH 副廠走 VAG 編碼：VAG-5H9 955 427 9B9 #BOSCHN
   *   - 沙漏場來路不明：VAG-5H9 955 427 9B9 #UNKUNK
   * 格式：{carBrand.code}-{segs joined by separator} {sourceCodePrefix}{BRAND3}{COUNTRY3}
   *   - BRAND3 = partBrand.code 前 3 字 / UNK 佔位
   *   - COUNTRY3 = country.code（ISO 3 碼）/ UNK 佔位
   */
  async previewCode(input: {
    tenantId: string;
    codeRuleId: string;
    segs: (string | null | undefined)[]; // up to 5 segs
    partBrandId?: string | null;
    countryId?: string | null;
  }): Promise<string> {
    // 下半場 A 軸翻轉後：規則對應「零件品牌」、料號 = {零件品牌代碼}-{各 SEG 以分隔符串接}
    const rule = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { id: input.codeRuleId, tenantId: input.tenantId },
      select: { separator: true, partBrandId: true },
    });
    if (!rule) throw new NotFoundException('codeRuleId not found for tenant');

    const segs = input.segs
      .slice(0, 5)
      .map((s) => (s == null ? '' : String(s).trim()))
      .filter((s) => s !== '');
    const segPart = segs.join(rule.separator);

    // 前綴 = 規則所屬零件品牌代碼（如 VAG / BOSCH）
    const pb = await this.prisma.nx01PartBrand.findFirst({
      where: { id: rule.partBrandId, tenantId: input.tenantId },
      select: { code: true },
    });
    const brandCode = pb?.code ?? '';

    if (!segPart) return brandCode;
    return brandCode ? `${brandCode}-${segPart}` : segPart;
  }

  private whereList(tenantId: string, q: ListPartQueryDto): Prisma.Nx01PartWhereInput {
    const where: Prisma.Nx01PartWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { secCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Part.count({ where }),
      this.prisma.nx01Part.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.$transaction(async (tx) => {
      const codeRuleId = await this.resolveCodeRuleId(tx, tenantId, dto.codeRuleId);
      await this.validateUnkReservedNotUsed(tx, tenantId, dto.partBrandId, dto.countryId);
      const created = await tx.nx01Part.create({
        data: {
          tenantId,
          codeRuleId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          isOem: dto.isOem ?? true,
          secCode: trimOrNull(dto.secCode),
          seg1: trimOrNull(dto.seg1),
          seg2: trimOrNull(dto.seg2),
          seg3: trimOrNull(dto.seg3),
          seg4: trimOrNull(dto.seg4),
          seg5: trimOrNull(dto.seg5),
          countryId: dto.countryId?.trim() || null,
          partBrandId: dto.partBrandId?.trim() || null,
          partGroupId: dto.partGroupId?.trim() || null,
          type: dto.partType ?? 1,
          spec: dto.spec?.trim() || null,
          uom: dto.uom?.trim() || 'pcs',
          isActive: dto.isActive ?? true,
          returnPolicy: dto.returnPolicy?.trim() || 'S',
          warrantyMonths: dto.warrantyMonths ?? 0,
          priceA: dto.priceA ?? 0,
          priceB: dto.priceB ?? 0,
          priceC: dto.priceC ?? 0,
          priceD: dto.priceD ?? 0,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      // drift #3 補：規格 §5.2「首次 part create：寫 version 1」
      await this.writePartVersionSnapshot(tx, tenantId, user.sub, created, null);
      return created;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_part',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立料號',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  /**
   * Crown Q1=A：part.update 同 tx 同步寫 part_version snapshot
   *   - versionNo = MAX + 1（per partId）
   *   - effectiveFrom = 當下、effectiveTo = null
   *   - 上一版的 effectiveTo 更新為當下（業務語意：版本有效期間連續）
   *   - changeReason 從 dto.changeReason 傳入（業務人員填、稽核用）
   */
  private async writePartVersionSnapshot(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    partRow: Row,
    changeReason: string | null,
  ): Promise<void> {
    const now = new Date();
    // 找上一版（同 partId、effectiveTo IS NULL）+ 更新 effectiveTo
    await tx.nx01PartVersion.updateMany({
      where: { tenantId, partId: partRow.id, effectiveTo: null },
      data: { effectiveTo: now, updatedBy: userId },
    });
    // 找 MAX versionNo
    const latest = await tx.nx01PartVersion.findFirst({
      where: { tenantId, partId: partRow.id },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    const nextVersionNo = (latest?.versionNo ?? 0) + 1;
    await tx.nx01PartVersion.create({
      data: {
        tenantId,
        partId: partRow.id,
        versionNo: nextVersionNo,
        effectiveFrom: now,
        effectiveTo: null,
        codeSnapshot: partRow.code,
        nameSnapshot: partRow.name,
        partBrandIdSnapshot: partRow.partBrandId,
        countryIdSnapshot: partRow.countryId,
        specSnapshot: partRow.spec,
        priceASnapshot: partRow.priceA,
        priceBSnapshot: partRow.priceB,
        priceCSnapshot: partRow.priceC,
        priceDSnapshot: partRow.priceD,
        changeReason,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePartDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part not found');

    // Q9=C UNK guard：只在 dto 傳新值時驗（不重驗既有 row）
    if (dto.partBrandId !== undefined || dto.countryId !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await this.validateUnkReservedNotUsed(
          tx,
          tenantId,
          dto.partBrandId,
          dto.countryId,
        );
      });
    }

    const priceTouched =
      dto.priceA !== undefined ||
      dto.priceB !== undefined ||
      dto.priceC !== undefined ||
      dto.priceD !== undefined;

    // Q1=A：part.update 同 tx 寫 part_version snapshot
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx01Part.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isOem !== undefined ? { isOem: dto.isOem } : {}),
        ...(dto.secCode !== undefined ? { secCode: trimOrNull(dto.secCode) } : {}),
        ...(dto.seg1 !== undefined ? { seg1: trimOrNull(dto.seg1) } : {}),
        ...(dto.seg2 !== undefined ? { seg2: trimOrNull(dto.seg2) } : {}),
        ...(dto.seg3 !== undefined ? { seg3: trimOrNull(dto.seg3) } : {}),
        ...(dto.seg4 !== undefined ? { seg4: trimOrNull(dto.seg4) } : {}),
        ...(dto.seg5 !== undefined ? { seg5: trimOrNull(dto.seg5) } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId?.trim() || null } : {}),
        ...(dto.partBrandId !== undefined ? { partBrandId: dto.partBrandId?.trim() || null } : {}),
        ...(dto.partGroupId !== undefined ? { partGroupId: dto.partGroupId?.trim() || null } : {}),
        ...(dto.partType !== undefined ? { type: dto.partType } : {}),
        ...(dto.spec !== undefined ? { spec: dto.spec } : {}),
        ...(dto.uom !== undefined ? { uom: dto.uom.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.returnPolicy !== undefined ? { returnPolicy: dto.returnPolicy.trim() } : {}),
        ...(dto.warrantyMonths !== undefined ? { warrantyMonths: dto.warrantyMonths } : {}),
        ...(dto.priceA !== undefined ? { priceA: dto.priceA } : {}),
        ...(dto.priceB !== undefined ? { priceB: dto.priceB } : {}),
        ...(dto.priceC !== undefined ? { priceC: dto.priceC } : {}),
        ...(dto.priceD !== undefined ? { priceD: dto.priceD } : {}),
        ...(priceTouched ? { priceUpdatedAt: new Date(), priceUpdatedBy: user.sub } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
      });

      // Q1=A: 寫 part_version snapshot（同 tx）
      await this.writePartVersionSnapshot(
        tx,
        tenantId,
        user.sub,
        updated,
        dto.changeReason?.trim() || null,
      );

      return updated;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part',
      entityId: id,
      entityCode: row.code,
      summary: '修改料號',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part not found');
    const row = await this.prisma.nx01Part.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除料號',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { type, priceA, priceB, priceC, priceD, ...rest } = row;
    return {
      ...rest,
      partType: type,
      priceA: decimalStr(priceA),
      priceB: decimalStr(priceB),
      priceC: decimalStr(priceC),
      priceD: decimalStr(priceD),
    };
  }
}
