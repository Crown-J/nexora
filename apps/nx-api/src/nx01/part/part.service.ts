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
  oldCode: true,
  cost: true,
  seg1: true,
  seg2: true,
  seg3: true,
  seg4: true,
  seg5: true,
  countryId: true,
  partBrandId: true,
  // W6 [3-8] 2026-06-06 品牌合併：新 brandId 為主、partBrandId 保留待後續軌 drop
  brandId: true,
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
  partBrand: { select: { code: true } },
  // W6 [3-8] 2026-06-06 品牌合併：brand relation 為主（後續軌 drop partBrand）
  brand: { select: { code: true, name: true, isCar: true, isPart: true } },
  country: { select: { code: true } },
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

/**
 * 完整料號顯示格式（收尾軌、Crown 拍板）：
 *   {零件品牌代碼} - {SEG1 SEG2 …（單空格）} #{產地代碼}
 *   例：VAG - 03H 115 562 H #DEU
 * SEG 一律單空格（規則分隔符已移除）；品牌 / 產地缺則該段省略。
 */
export function buildDisplayCode(
  brandCode: string,
  segs: (string | null | undefined)[],
  countryCode: string,
): string {
  const segPart = segs
    .slice(0, 5)
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter((s) => s !== '')
    .join(' ');
  let out = brandCode && segPart ? `${brandCode} - ${segPart}` : segPart || brandCode;
  if (countryCode) out = out ? `${out} #${countryCode}` : `#${countryCode}`;
  return out;
}

/** 搜尋正規化：去空格 / 連字號 / # 後小寫，讓 VAG-03H、VAG 03H、03H 115 562 都能比對 */
function normalizeCode(s: string): string {
  return s.replace(/[\s#-]/g, '').toLowerCase();
}

/**
 * M2-b 業界 muscle memory：售價 ABCD 對應客戶分級毛利率。
 * fallback 預設值（如 customer_grade 表沒設 / sortNo 缺）：A=12% / B=15% / C=18% / D=22%
 * 對齊 NX01-07 base catalog 拍板。
 */
const DEFAULT_MARGINS: Record<string, number> = { A: 12, B: 15, C: 18, D: 22 };

@Injectable()
export class PartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /**
   * M2-b：依成本 × customer_grade.marginPct 算建議售價 ABCD。
   * 公式：price = cost × (1 + marginPct/100)
   * - 用 tenant 自訂 customer_grade marginPct（per code A/B/C/D）
   * - tenant 沒設該 code → 用 DEFAULT_MARGINS fallback
   * - cost <= 0 → 全部回傳 0（不算負毛利）
   */
  private async calcDefaultPrices(
    tx: Prisma.TransactionClient,
    tenantId: string,
    cost: PrismaNs.Decimal,
  ): Promise<{ priceA: PrismaNs.Decimal; priceB: PrismaNs.Decimal; priceC: PrismaNs.Decimal; priceD: PrismaNs.Decimal }> {
    if (cost.lte(0)) {
      const zero = new PrismaNs.Decimal(0);
      return { priceA: zero, priceB: zero, priceC: zero, priceD: zero };
    }
    const grades = await tx.nx01CustomerGrade.findMany({
      where: { tenantId, isActive: true, code: { in: ['A', 'B', 'C', 'D'] } },
      select: { code: true, marginPct: true },
    });
    const marginMap: Record<string, PrismaNs.Decimal> = {};
    for (const g of grades) marginMap[g.code] = new PrismaNs.Decimal(g.marginPct);
    const calc = (code: 'A' | 'B' | 'C' | 'D'): PrismaNs.Decimal => {
      const margin = marginMap[code] ?? new PrismaNs.Decimal(DEFAULT_MARGINS[code]);
      return cost.mul(margin.div(100).add(1)).toDecimalPlaces(4);
    };
    return { priceA: calc('A'), priceB: calc('B'), priceC: calc('C'), priceD: calc('D') };
  }

  /**
   * M2-b：依成本重算建議售價（前端「依成本重算」按鈕對應端點）。
   * - 系統算為主（cost × margin）、可手動微調（直接 PATCH priceA~D）
   * - 寫 priceUpdatedAt/By + audit
   */
  async recalcPricesByCost(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.nx01Part.findFirst({ where: { id: partId, tenantId }, select: SEL });
      if (!existing) throw new NotFoundException('Part not found');
      const cost = existing.cost != null ? new PrismaNs.Decimal(existing.cost) : new PrismaNs.Decimal(0);
      const prices = await this.calcDefaultPrices(tx, tenantId, cost);
      const updated = await tx.nx01Part.update({
        where: { id: partId },
        data: {
          ...prices,
          priceUpdatedAt: new Date(),
          priceUpdatedBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      await this.writePartVersionSnapshot(tx, tenantId, user.sub, updated, '依成本重算建議售價');
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX01',
        action: 'UPDATE',
        entityTable: 'nx01_part',
        entityId: partId,
        entityCode: updated.code,
        summary: '依成本重算建議售價（M2-b）',
        beforeData: existing as object,
        afterData: updated as object,
      });
      return this.mapRow(updated);
    });
  }

  /**
   * 編碼規則 ID 解析（W5 [3-7] 2026-06-06 改、對齊 Crown 拍板）：
   *   - 舊：Crown Q5=A 強制必填（業務先建 brand_code_rule、再建 part）
   *   - 新：LITE 編碼規則引擎不在範圍（屬汽車資料庫套件）、code 改手動填預設帶 oldCode、codeRuleId optional
   *   - schema 已 nullable、本 helper 拿掉強制必填、回傳 null 表示「未綁規則、純手動填料號」
   */
  private async resolveCodeRuleId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    codeRuleId: string | undefined,
  ): Promise<string | null> {
    if (!codeRuleId?.trim()) return null;
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
    // 收尾軌完整料號格式：{零件品牌代碼} - {SEG1 SEG2 …（單空格）} #{產地代碼}
    // 規則分隔符已移除、SEG 一律單空格；前綴用零件本身的 partBrand、產地用 country。
    let brandCode = '';
    if (input.partBrandId?.trim()) {
      const pb = await this.prisma.nx01PartBrand.findFirst({
        where: { id: input.partBrandId.trim(), tenantId: input.tenantId },
        select: { code: true },
      });
      brandCode = pb?.code ?? '';
    }
    let countryCode = '';
    if (input.countryId?.trim()) {
      const c = await this.prisma.nx01Country.findUnique({
        where: { id: input.countryId.trim() },
        select: { code: true },
      });
      countryCode = c?.code ?? '';
    }
    return buildDisplayCode(brandCode, input.segs, countryCode);
  }

  async list(user: RequestUser, q: ListPartQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01PartWhereInput = { tenantId };
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const term = q.search?.trim() ?? '';
    if (term) {
      // C + 收尾軌 item 8：正規化（去空格/-/#）後比對 主料號(含完整格式) / 舊料號 / 副廠 / 正廠對應料號；品名用原詞。
      // 讓「VAG-03H」「VAG 03H」「03H 115 562」三種寫法都命中（part.code 存完整料號）。
      const norm = `%${normalizeCode(term)}%`;
      const raw = `%${term.toLowerCase()}%`;
      const matched = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM nx01_part WHERE tenant_id = $1 AND (
           regexp_replace(lower(code), '[ #-]', '', 'g') LIKE $2
           OR lower(name) LIKE $3
           OR regexp_replace(lower(coalesce(old_code,'')), '[ #-]', '', 'g') LIKE $2
           OR regexp_replace(lower(coalesce(sec_code,'')), '[ #-]', '', 'g') LIKE $2
           OR id IN (SELECT part_id FROM nx01_part_oem_code WHERE tenant_id = $1 AND regexp_replace(lower(oem_code), '[ #-]', '', 'g') LIKE $2)
         )`,
        tenantId,
        norm,
        raw,
      );
      const ids = matched.map((m) => m.id);
      if (ids.length === 0) return { page, pageSize, total: 0, rows: [] };
      where.id = { in: ids };
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx01Part.count({ where }),
      this.prisma.nx01Part.findMany({ where, orderBy: { code: 'asc' }, skip, take: pageSize, select: SEL }),
    ]);

    // 標示「主料號命中 primary / 替代品命中 oem」（正規化判斷）
    const nt = normalizeCode(term);
    const rawL = term.toLowerCase();
    const matchType = (r: Row): 'primary' | 'oem' | null => {
      if (!term) return null;
      const nhit = (v: string | null | undefined) => normalizeCode(v ?? '').includes(nt);
      return nhit(r.code) || (r.name ?? '').toLowerCase().includes(rawL) || nhit(r.secCode) || nhit(r.oldCode)
        ? 'primary'
        : 'oem';
    };
    return { page, pageSize, total, rows: rows.map((r) => ({ ...this.mapRow(r), matchType: matchType(r) })) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Part.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part not found');
    const oemCodes = await this.loadOemCodes(tenantId, id);
    return { ...this.mapRow(row), oemCodes };
  }

  async create(user: RequestUser, dto: CreatePartDto) {
    const tenantId = requireTenantId(user);
    // W5 [3-7] 2026-06-06 Crown 拍板四層編碼：
    //   零件料號 code 必填、新增時若 user 未填 → fallback 帶入 oldCode（舊有料號）；
    //   兩者皆空 → 拒收（零件料號是顯示主碼、不可為空）
    const codeInput = dto.code?.trim();
    const oldCodeInput = dto.oldCode?.trim();
    const effectiveCode = codeInput || oldCodeInput;
    if (!effectiveCode) {
      throw new BadRequestException(
        '零件料號（code）必填；可手動填或讓系統帶入舊料號（oldCode）',
      );
    }
    const row = await this.prisma.$transaction(async (tx) => {
      // W5 [3-7]：codeRuleId 改 optional（編碼規則引擎屬汽車資料庫套件、LITE 不在）
      const codeRuleId = await this.resolveCodeRuleId(tx, tenantId, dto.codeRuleId);
      await this.validateUnkReservedNotUsed(tx, tenantId, dto.partBrandId, dto.countryId);
      // M2-b：dto 沒傳 priceA~D 時、後端依 cost × margin 自動算（系統算為主、手動微調走 dto 覆寫）
      const cost = new PrismaNs.Decimal(dto.cost ?? 0);
      const defaults = await this.calcDefaultPrices(tx, tenantId, cost);
      // W6 [3-8]：dto.brandId 為主、若舊 caller 仍送 partBrandId → service 端 lookup brand by code 對齊
      let effectiveBrandId = dto.brandId?.trim() || null;
      if (!effectiveBrandId && dto.partBrandId?.trim()) {
        const pb = await tx.nx01PartBrand.findFirst({
          where: { id: dto.partBrandId.trim(), tenantId },
          select: { code: true },
        });
        if (pb) {
          const b = await tx.nx01Brand.findFirst({
            where: { tenantId, code: pb.code, isPart: true },
            select: { id: true },
          });
          effectiveBrandId = b?.id ?? null;
        }
      }
      const created = await tx.nx01Part.create({
        data: {
          tenantId,
          codeRuleId,
          code: effectiveCode,
          name: dto.name.trim(),
          isOem: dto.isOem ?? true,
          secCode: trimOrNull(dto.secCode),
          oldCode: trimOrNull(dto.oldCode),
          cost: dto.cost ?? 0,
          seg1: trimOrNull(dto.seg1),
          seg2: trimOrNull(dto.seg2),
          seg3: trimOrNull(dto.seg3),
          seg4: trimOrNull(dto.seg4),
          seg5: trimOrNull(dto.seg5),
          countryId: dto.countryId?.trim() || null,
          // W6 [3-8]：寫入舊 partBrandId 同時寫 brandId（dual-write 過渡期、後續軌 stop 寫舊欄位）
          partBrandId: dto.partBrandId?.trim() || null,
          brandId: effectiveBrandId,
          partGroupId: dto.partGroupId?.trim() || null,
          type: dto.partType ?? 1,
          spec: dto.spec?.trim() || null,
          uom: dto.uom?.trim() || 'pcs',
          isActive: dto.isActive ?? true,
          returnPolicy: dto.returnPolicy?.trim() || 'S',
          warrantyMonths: dto.warrantyMonths ?? 0,
          priceA: dto.priceA ?? defaults.priceA,
          priceB: dto.priceB ?? defaults.priceB,
          priceC: dto.priceC ?? defaults.priceC,
          priceD: dto.priceD ?? defaults.priceD,
          priceUpdatedAt: new Date(),
          priceUpdatedBy: user.sub,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      // drift #3 補：規格 §5.2「首次 part create：寫 version 1」
      await this.writePartVersionSnapshot(tx, tenantId, user.sub, created, null);
      // B：正廠對應料號子表
      await this.replaceOemCodes(tx, tenantId, user.sub, created.id, dto.oemCodes);
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
    // M2-b：cost 改 + dto 沒覆寫 priceA~D → 自動依新成本重算（系統算為主）
    const costTouched = dto.cost !== undefined;

    // Q1=A：part.update 同 tx 寫 part_version snapshot
    const row = await this.prisma.$transaction(async (tx) => {
      // M2-b：autoPrices 在 cost 改 + price 沒手動覆寫時計算（手動覆寫優先）
      let autoPrices: { priceA: PrismaNs.Decimal; priceB: PrismaNs.Decimal; priceC: PrismaNs.Decimal; priceD: PrismaNs.Decimal } | null = null;
      if (costTouched && !priceTouched) {
        const cost = new PrismaNs.Decimal(dto.cost!);
        autoPrices = await this.calcDefaultPrices(tx, tenantId, cost);
      }
      const updated = await tx.nx01Part.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isOem !== undefined ? { isOem: dto.isOem } : {}),
        ...(dto.secCode !== undefined ? { secCode: trimOrNull(dto.secCode) } : {}),
        ...(dto.oldCode !== undefined ? { oldCode: trimOrNull(dto.oldCode) } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.seg1 !== undefined ? { seg1: trimOrNull(dto.seg1) } : {}),
        ...(dto.seg2 !== undefined ? { seg2: trimOrNull(dto.seg2) } : {}),
        ...(dto.seg3 !== undefined ? { seg3: trimOrNull(dto.seg3) } : {}),
        ...(dto.seg4 !== undefined ? { seg4: trimOrNull(dto.seg4) } : {}),
        ...(dto.seg5 !== undefined ? { seg5: trimOrNull(dto.seg5) } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId?.trim() || null } : {}),
        ...(dto.partBrandId !== undefined ? { partBrandId: dto.partBrandId?.trim() || null } : {}),
        // W6 [3-8]：brandId 寫入（dto 端可直接送、不再需 partBrandId 走 lookup）
        ...(dto.brandId !== undefined ? { brandId: dto.brandId?.trim() || null } : {}),
        ...(dto.partGroupId !== undefined ? { partGroupId: dto.partGroupId?.trim() || null } : {}),
        ...(dto.partType !== undefined ? { type: dto.partType } : {}),
        ...(dto.spec !== undefined ? { spec: dto.spec } : {}),
        ...(dto.uom !== undefined ? { uom: dto.uom.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.returnPolicy !== undefined ? { returnPolicy: dto.returnPolicy.trim() } : {}),
        ...(dto.warrantyMonths !== undefined ? { warrantyMonths: dto.warrantyMonths } : {}),
        // 優先：dto 手動覆寫 > autoPrices（cost 改時自動算） > 不動
        ...(dto.priceA !== undefined ? { priceA: dto.priceA } : autoPrices ? { priceA: autoPrices.priceA } : {}),
        ...(dto.priceB !== undefined ? { priceB: dto.priceB } : autoPrices ? { priceB: autoPrices.priceB } : {}),
        ...(dto.priceC !== undefined ? { priceC: dto.priceC } : autoPrices ? { priceC: autoPrices.priceC } : {}),
        ...(dto.priceD !== undefined ? { priceD: dto.priceD } : autoPrices ? { priceD: autoPrices.priceD } : {}),
        ...(priceTouched || autoPrices ? { priceUpdatedAt: new Date(), priceUpdatedBy: user.sub } : {}),
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

      // B：正廠對應料號子表（dto.oemCodes 提供時整批取代）
      await this.replaceOemCodes(tx, tenantId, user.sub, id, dto.oemCodes);

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
    const { type, cost, priceA, priceB, priceC, priceD, partBrand, brand, country, ...rest } = row;
    // W6 [3-8]：品牌 code 優先用新 brand relation、fallback 舊 partBrand（過渡期）
    const brandCode = brand?.code ?? partBrand?.code ?? '';
    // displayCode：未選編碼規則→原樣手動料號；選了→完整格式即時組合（不存 DB）
    const displayCode = rest.codeRuleId
      ? buildDisplayCode(brandCode, [rest.seg1, rest.seg2, rest.seg3, rest.seg4, rest.seg5], country?.code ?? '')
      : rest.code;
    return {
      ...rest,
      partType: type,
      cost: decimalStr(cost),
      priceA: decimalStr(priceA),
      priceB: decimalStr(priceB),
      priceC: decimalStr(priceC),
      priceD: decimalStr(priceD),
      partBrandCode: partBrand?.code ?? null,
      // W6 [3-8] 新增 brand 完整資訊
      brandCode: brand?.code ?? null,
      brandName: brand?.name ?? null,
      countryCode: country?.code ?? null,
      displayCode,
    };
  }

  /** 載入某零件的正廠對應料號（子表） */
  private async loadOemCodes(tenantId: string, partId: string) {
    const rows = await this.prisma.nx01PartOemCode.findMany({
      where: { tenantId, partId },
      orderBy: [{ sortNo: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, partBrandId: true, oemCode: true, remark: true, sortNo: true },
    });
    return rows;
  }

  /** 取代某零件的正廠對應料號（先刪後建，於 tx 內）；oemCodes=undefined 不動 */
  private async replaceOemCodes(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    partId: string,
    oemCodes: { partBrandId?: string | null; oemCode: string; remark?: string | null }[] | undefined,
  ): Promise<void> {
    if (oemCodes === undefined) return;
    await tx.nx01PartOemCode.deleteMany({ where: { tenantId, partId } });
    let sortNo = 0;
    for (const o of oemCodes) {
      const oemCode = String(o.oemCode ?? '').trim();
      if (!oemCode) continue;
      await tx.nx01PartOemCode.create({
        data: {
          tenantId,
          partId,
          partBrandId: o.partBrandId?.trim() || null,
          oemCode,
          remark: o.remark?.trim() || null,
          sortNo: sortNo++,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
  }
}
