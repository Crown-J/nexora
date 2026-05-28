import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
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
  creditLimit: true,
  creditStatus: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  customerGrade: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01PartnerGetPayload<{ select: typeof SEL }>;

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
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
    const code = dto.code.trim();
    const dup = await this.prisma.nx01Partner.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Partner code already exists');
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
        ...(dto.creditLimit !== undefined ? { creditLimit: dto.creditLimit } : {}),
        ...(dto.creditStatus !== undefined ? { creditStatus: dto.creditStatus.trim() } : {}),
        ...(dto.paymentTermImport !== undefined
          ? { paymentTermImport: dto.paymentTermImport?.trim() || null }
          : {}),
        ...(dto.incoterm !== undefined ? { incoterm: dto.incoterm?.trim() || null } : {}),
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
      entityTable: 'nx01_partner',
      entityId: id,
      entityCode: row.code,
      summary: '修改夥伴',
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
    const { customerGrade, creditLimit, ...scalar } = row;
    return {
      ...scalar,
      creditLimit: creditLimit == null ? null : String(creditLimit),
      customerGradeCode: customerGrade?.code ?? null,
      customerGradeName: customerGrade?.name ?? null,
    };
  }
}
