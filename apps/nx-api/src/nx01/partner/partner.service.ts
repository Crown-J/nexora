import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { SeqCounterService, type SeqScope } from '../../shared/nx01/seq-counter.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePartnerDto, ListPartnerQueryDto, UpdatePartnerDto } from './dto/partner.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  partnerType: true,
  canTransferStock: true,
  contactName: true,
  phone: true,
  mobile: true,
  email: true,
  address: true,
  remark: true,
  isActive: true,
  taxId: true,
  paymentTermDomestic: true,
  paymentTermImport: true,
  incoterm: true,
  customerGradeId: true,
  // M2-c 加：供應商等級（純供應商 S 用、業務手動或自動算）
  supplierGradeId: true,
  creditLimit: true,
  creditStatus: true,
  // v1.2 對齊 階段 E P2：basic 補欄
  shortName: true,
  nameEn: true,
  fax: true,
  website: true,
  serviceLocation: true,
  // v1.2 階段 E P2：sales 補欄
  defaultWarehouseId: true,
  salesUserId: true,
  // v1.2 階段 E P2：finance 補欄
  defaultCurrencyId: true,
  // W3 [3-2] 舊系統代號
  legacyCode: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  customerGrade: { select: { code: true, name: true } },
  supplierGrade: { select: { code: true, name: true } },
  defaultWarehouse: { select: { code: true, name: true } },
  salesUser: { select: { userAccount: true, userName: true } },
  defaultCurrency: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01PartnerGetPayload<{ select: typeof SEL }>;

/**
 * M2-c：付款條件 → 供應商等級代碼映射（Crown 拍板：付款條件對我方越有利等級越高）。
 * - NET90 → A（付 90 天最對我方有利）
 * - NET60 → B
 * - NET30 → C
 * - PREPAY → D（要先付款、最不利）
 * - 其他 → null（不自動降級、保持原值）
 *
 * 信用紀錄 / 不良率 = ⚠️ TODO（數據累積後再加權平均、本軌只做付款條件單軸）。
 */
function paymentTermToGradeCode(paymentTerm: string | null | undefined): string | null {
  switch (paymentTerm?.trim().toUpperCase()) {
    case 'NET90':
      return 'A';
    case 'NET60':
      return 'B';
    case 'NET30':
      return 'C';
    case 'PREPAY':
      return 'D';
    default:
      return null;
  }
}

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly seq: SeqCounterService,
  ) {}

  private whereList(tenantId: string, q: ListPartnerQueryDto): Prisma.Nx01PartnerWhereInput {
    const where: Prisma.Nx01PartnerWhereInput = { tenantId };
    if (q.partnerType) where.partnerType = q.partnerType;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { contactName: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartnerQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Partner.count({ where }),
      this.prisma.nx01Partner.findMany({
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
    const row = await this.prisma.nx01Partner.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Partner not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartnerDto) {
    const tenantId = requireTenantId(user);
    // W3 [3-1]：code 未填 → 自動取下一個 類型+4 碼；已填 → 直接用 + 推進 counter 防衝突
    const partnerType = dto.partnerType.toUpperCase();
    let code = dto.code?.trim();
    if (!code) {
      code = await this.seq.nextPartnerCode(tenantId, partnerType);
    } else {
      const n = SeqCounterService.parseSerialNumber(code, partnerType);
      if (n != null) {
        const scope = `PARTNER_${partnerType}` as SeqScope;
        await this.seq.reserveIfHigher(tenantId, scope, n);
      }
    }
    const dup = await this.prisma.nx01Partner.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('往來對象代碼已被其他人使用、請改用其他編號');
    // 同行 'O' service 層預設 canTransferStock=true（業務語意：同行天然可調貨）；其他類型 default false、DTO 可覆寫
    const defaultCanTransferStock = dto.partnerType === 'O';
    const row = await this.prisma.nx01Partner.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        partnerType: dto.partnerType,
        canTransferStock: dto.canTransferStock ?? defaultCanTransferStock,
        contactName: dto.contactName?.trim() || null,
        phone: dto.phone?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        remark: dto.remark?.trim() || null,
        taxId: dto.taxId?.trim() || null,
        paymentTermDomestic: dto.paymentTermDomestic?.trim() || 'NET30',
        customerGradeId: dto.customerGradeId?.trim() || null,
        creditLimit: dto.creditLimit ?? 0,
        creditStatus: dto.creditStatus?.trim() || 'N',
        paymentTermImport: dto.paymentTermImport?.trim() || 'TT',
        incoterm: dto.incoterm?.trim() || 'FOB',
        isActive: dto.isActive ?? true,
        // v1.2 階段 E P2：basic 補欄
        shortName: dto.shortName?.trim() || null,
        nameEn: dto.nameEn?.trim() || null,
        fax: dto.fax?.trim() || null,
        website: dto.website?.trim() || null,
        serviceLocation: dto.serviceLocation?.trim() || null,
        // v1.2 階段 E P2：sales 補欄
        defaultWarehouseId: dto.defaultWarehouseId?.trim() || null,
        salesUserId: dto.salesUserId?.trim() || null,
        // v1.2 階段 E P2：finance 補欄
        defaultCurrencyId: dto.defaultCurrencyId?.trim() || null,
        // v1.2 階段 E P2：supplierGradeId 純供應商 S 用
        supplierGradeId: dto.supplierGradeId?.trim() || null,
        // W3 [3-2] 舊系統代號
        legacyCode: dto.legacyCode?.trim() || null,
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
      entityTable: 'nx01_partner',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立夥伴',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePartnerDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Partner.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Partner not found');
    const row = await this.prisma.nx01Partner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.partnerType !== undefined ? { partnerType: dto.partnerType } : {}),
        ...(dto.canTransferStock !== undefined ? { canTransferStock: dto.canTransferStock } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId?.trim() || null } : {}),
        ...(dto.paymentTermDomestic !== undefined
          ? { paymentTermDomestic: dto.paymentTermDomestic.trim() }
          : {}),
        ...(dto.customerGradeId !== undefined
          ? { customerGradeId: dto.customerGradeId?.trim() || null }
          : {}),
        ...(dto.supplierGradeId !== undefined
          ? { supplierGradeId: dto.supplierGradeId?.trim() || null }
          : {}),
        ...(dto.creditLimit !== undefined ? { creditLimit: dto.creditLimit } : {}),
        ...(dto.creditStatus !== undefined ? { creditStatus: dto.creditStatus.trim() } : {}),
        ...(dto.paymentTermImport !== undefined
          ? { paymentTermImport: dto.paymentTermImport?.trim() || null }
          : {}),
        ...(dto.incoterm !== undefined ? { incoterm: dto.incoterm?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        // v1.2 階段 E P2：basic 補欄
        ...(dto.shortName !== undefined ? { shortName: dto.shortName?.trim() || null } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn?.trim() || null } : {}),
        ...(dto.fax !== undefined ? { fax: dto.fax?.trim() || null } : {}),
        ...(dto.website !== undefined ? { website: dto.website?.trim() || null } : {}),
        ...(dto.serviceLocation !== undefined
          ? { serviceLocation: dto.serviceLocation?.trim() || null }
          : {}),
        // v1.2 階段 E P2：sales 補欄
        ...(dto.defaultWarehouseId !== undefined
          ? { defaultWarehouseId: dto.defaultWarehouseId?.trim() || null }
          : {}),
        ...(dto.salesUserId !== undefined
          ? { salesUserId: dto.salesUserId?.trim() || null }
          : {}),
        // v1.2 階段 E P2：finance 補欄
        ...(dto.defaultCurrencyId !== undefined
          ? { defaultCurrencyId: dto.defaultCurrencyId?.trim() || null }
          : {}),
        // W3 [3-2] 舊系統代號
        ...(dto.legacyCode !== undefined ? { legacyCode: dto.legacyCode?.trim() || null } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_partner',
      entityId: id,
      entityCode: row.code,
      summary: '修改夥伴',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  /**
   * M2-c：依付款條件 + 手動覆寫重算供應商等級。
   * - 業務按「依付款條件重算」按鈕觸發
   * - 找付款條件對應 supplier_grade.code、寫進 supplierGradeId
   * - 找不到 grade（tenant 自定 + 沒 A~D code）→ NotFound、不寫入
   */
  async recalcSupplierGradeByPaymentTerm(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Partner.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Partner not found');
    const gradeCode = paymentTermToGradeCode(existing.paymentTermDomestic);
    if (!gradeCode) {
      throw new ConflictException(
        `paymentTermDomestic '${existing.paymentTermDomestic}' 無對應供應商等級映射、請手動指派 supplierGradeId`,
      );
    }
    const grade = await this.prisma.nx01SupplierGrade.findFirst({
      where: { tenantId, code: gradeCode, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (!grade) {
      throw new NotFoundException(`SupplierGrade code='${gradeCode}' 不存在（請確認 seed apply-supplier-grade 已套用）`);
    }
    const row = await this.prisma.nx01Partner.update({
      where: { id },
      data: { supplierGradeId: grade.id, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_partner',
      entityId: id,
      entityCode: row.code,
      summary: `依付款條件 ${existing.paymentTermDomestic} 重算供應商等級 → ${grade.code}（M2-c）`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Partner.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Partner not found');
    const row = await this.prisma.nx01Partner.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_partner',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除夥伴',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const {
      customerGrade,
      supplierGrade,
      defaultWarehouse,
      salesUser,
      defaultCurrency,
      creditLimit,
      ...scalar
    } = row;
    return {
      ...scalar,
      creditLimit: creditLimit == null ? null : String(creditLimit),
      customerGradeCode: customerGrade?.code ?? null,
      customerGradeName: customerGrade?.name ?? null,
      supplierGradeCode: supplierGrade?.code ?? null,
      supplierGradeName: supplierGrade?.name ?? null,
      // v1.2 階段 E P2：補關聯顯示欄
      defaultWarehouseCode: defaultWarehouse?.code ?? null,
      defaultWarehouseName: defaultWarehouse?.name ?? null,
      salesUserAccount: salesUser?.userAccount ?? null,
      salesUserName: salesUser?.userName ?? null,
      defaultCurrencyCode: defaultCurrency?.code ?? null,
      defaultCurrencyName: defaultCurrency?.name ?? null,
    };
  }
}
